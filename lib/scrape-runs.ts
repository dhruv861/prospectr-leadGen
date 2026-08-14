import { prisma } from "./prisma";
import {
  buildActorInput,
  extractCostFromRun,
  getDatasetItems,
  getRunStatus,
  isInsufficientCreditsError,
  isTerminalStatus,
  startActorRun,
} from "./apify";
import { getAccountToken, listAccountsWithLiveState, markAccountExhausted } from "./apify-accounts";
import { upsertLeadsFromDataset } from "./leads";
import type { ApifyAccount, Prisma, ScrapeRun } from "@prisma/client";

export type ScrapeRunWithRelations = Prisma.ScrapeRunGetPayload<{
  include: { requestedBy: { select: { name: true } }; apifyAccount: { select: { label: true } } };
}>;

export type SerializedScrapeRun = Omit<
  ScrapeRunWithRelations,
  "estimatedCostUsd" | "startedAt" | "finishedAt"
> & {
  estimatedCostUsd: number | null;
  startedAt: string;
  finishedAt: string | null;
};

export function serializeScrapeRun(run: ScrapeRunWithRelations): SerializedScrapeRun {
  return {
    ...run,
    estimatedCostUsd: run.estimatedCostUsd != null ? Number(run.estimatedCostUsd) : null,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
  };
}

export class NoAvailableApifyAccountError extends Error {
  constructor() {
    super("No active Apify account with remaining budget is available");
    this.name = "NoAvailableApifyAccountError";
  }
}

function getCooldownDays(): number {
  return Number(process.env.SCRAPE_COOLDOWN_DAYS ?? "30");
}

export async function checkCooldown(
  searchTerm: string,
  locality: string
): Promise<{ onCooldown: boolean; lastRun: ScrapeRun | null }> {
  const cooldownDays = getCooldownDays();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - cooldownDays);

  const lastRun = await prisma.scrapeRun.findFirst({
    where: {
      searchTerm: { equals: searchTerm, mode: "insensitive" },
      locality: { equals: locality, mode: "insensitive" },
      status: "succeeded",
      finishedAt: { gte: since },
    },
    orderBy: { finishedAt: "desc" },
  });

  return { onCooldown: lastRun !== null, lastRun };
}

export async function pickAvailableAccount(): Promise<ApifyAccount> {
  const accounts = await listAccountsWithLiveState();
  const available = accounts.find(
    (a) => a.status === "active" && Number(a.usedThisCycleUsd) < Number(a.monthlyBudgetUsd)
  );
  if (!available) {
    throw new NoAvailableApifyAccountError();
  }
  return available;
}

const ACTOR_ID = () => process.env.APIFY_ACTOR_ID ?? "compass/crawler-google-places";

export async function createScrapeRun(input: {
  searchTerm: string;
  locality: string;
  requestedByUserId: string;
  bypassCooldown?: boolean;
}): Promise<{ kind: "cooldown"; lastRun: ScrapeRun } | { kind: "started"; scrapeRun: ScrapeRun }> {
  const { searchTerm, locality, requestedByUserId, bypassCooldown } = input;

  if (!bypassCooldown) {
    const { onCooldown, lastRun } = await checkCooldown(searchTerm, locality);
    if (onCooldown && lastRun) {
      return { kind: "cooldown", lastRun };
    }
  }

  const actorInput = buildActorInput(searchTerm, locality);
  const accounts = await listAccountsWithLiveState();
  const candidates = accounts.filter(
    (a) => a.status === "active" && Number(a.usedThisCycleUsd) < Number(a.monthlyBudgetUsd)
  );
  if (candidates.length === 0) {
    throw new NoAvailableApifyAccountError();
  }

  let lastError: unknown;
  for (const account of candidates) {
    try {
      const token = getAccountToken(account);
      const { apifyRunId } = await startActorRun(ACTOR_ID(), actorInput, token);
      const scrapeRun = await prisma.scrapeRun.create({
        data: {
          searchTerm,
          locality,
          requestedById: requestedByUserId,
          apifyAccountId: account.id,
          apifyRunId,
          status: "running",
        },
      });
      return { kind: "started", scrapeRun };
    } catch (err) {
      lastError = err;
      if (isInsufficientCreditsError(err)) {
        await markAccountExhausted(account.id);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new NoAvailableApifyAccountError();
}

export async function pollAndCompleteScrapeRun(scrapeRunId: string): Promise<ScrapeRun> {
  const scrapeRun = await prisma.scrapeRun.findUniqueOrThrow({
    where: { id: scrapeRunId },
    include: { apifyAccount: true },
  });

  if (scrapeRun.status !== "running") {
    return scrapeRun;
  }

  const token = getAccountToken(scrapeRun.apifyAccount);
  const runInfo = await getRunStatus(scrapeRun.apifyRunId, token);

  if (!isTerminalStatus(runInfo.status)) {
    return scrapeRun;
  }

  if (runInfo.status !== "SUCCEEDED") {
    // Atomic claim: guards against a second, overlapping poll (the browser polls
    // every few seconds, and a slow completion pipeline for a long-running Apify
    // run can leave more than one poll observing status="running" concurrently).
    // Only a poll that actually flips running -> failed proceeds past this point.
    await prisma.scrapeRun.updateMany({
      where: { id: scrapeRunId, status: "running" },
      data: { status: "failed", finishedAt: new Date() },
    });
    return prisma.scrapeRun.findUniqueOrThrow({ where: { id: scrapeRunId } });
  }

  const items = await getDatasetItems(runInfo.defaultDatasetId, token);
  const { created, updated } = await upsertLeadsFromDataset(items, scrapeRun.id, scrapeRun.locality);
  const placesReturned = created + updated;
  const costUsd = extractCostFromRun(runInfo, placesReturned);

  // Same atomic claim as above: the account budget must only be charged once per
  // run. If two polls both fetched the dataset concurrently (harmless, idempotent
  // re-reads of Apify's already-produced output), only the one whose conditional
  // update actually matches a still-"running" row gets to increment the account.
  const { count } = await prisma.scrapeRun.updateMany({
    where: { id: scrapeRunId, status: "running" },
    data: {
      status: "succeeded",
      finishedAt: new Date(),
      placesReturned,
      estimatedCostUsd: costUsd,
    },
  });

  if (count === 1) {
    await prisma.apifyAccount.update({
      where: { id: scrapeRun.apifyAccountId },
      data: { usedThisCycleUsd: { increment: costUsd } },
    });
  }

  return prisma.scrapeRun.findUniqueOrThrow({ where: { id: scrapeRunId } });
}
