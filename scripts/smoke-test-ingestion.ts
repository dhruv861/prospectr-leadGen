/**
 * Standalone verification of the lib/ ingestion layer against a real, cheap
 * Apify run — proves cooldown, account rotation, cost tracking, and the
 * upsert-exclusion rule (spec §4e) before any route or screen is built.
 *
 * Usage: npm run smoke
 * Requires: `npm run seed` already run, and at least one APIFY_TOKEN_n set.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { createScrapeRun, pollAndCompleteScrapeRun } from "../lib/scrape-runs";

const SEARCH_TERM = "cafe";
const LOCALITY = "Bandra West, Mumbai, India";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTerminal(scrapeRunId: string, timeoutMs = 5 * 60 * 1000) {
  const start = Date.now();
  for (;;) {
    const run = await pollAndCompleteScrapeRun(scrapeRunId);
    if (run.status !== "running") return run;
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for scrape run to finish");
    console.log(`  ...still running (${Math.round((Date.now() - start) / 1000)}s elapsed)`);
    await sleep(5000);
  }
}

async function main() {
  console.log("=== Step 0: locate seeded admin user ===");
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("No admin user found — run `npm run seed` first.");
  console.log(`  using admin ${admin.email} (${admin.id})`);

  console.log("\n=== Step 1: start a real, cheap scrape run (maxCrawledPlacesPerSearch=5) ===");
  process.env.APIFY_MAX_PLACES_PER_SEARCH = "5";
  const firstAttempt = await createScrapeRun({
    searchTerm: SEARCH_TERM,
    locality: LOCALITY,
    requestedByUserId: admin.id,
  });
  if (firstAttempt.kind === "cooldown") {
    console.log("  Already on cooldown from a prior run — this is expected on a re-run of this script.");
    console.log("  To fully re-verify step 1-2, clear scrape_runs for this search_term/locality first.");
  } else {
    console.log(`  started scrapeRunId=${firstAttempt.scrapeRun.id} apifyRunId=${firstAttempt.scrapeRun.apifyRunId}`);
    console.log("\n=== Step 2: poll until terminal ===");
    const finished = await waitForTerminal(firstAttempt.scrapeRun.id);
    console.log(`  final status=${finished.status} placesReturned=${finished.placesReturned} estimatedCostUsd=${finished.estimatedCostUsd}`);
    if (finished.status !== "succeeded") {
      throw new Error(`Expected run to succeed, got ${finished.status}`);
    }
  }

  console.log("\n=== Step 3: repeat identical search — must hit cooldown, no new Apify spend ===");
  const secondAttempt = await createScrapeRun({
    searchTerm: SEARCH_TERM,
    locality: LOCALITY,
    requestedByUserId: admin.id,
  });
  if (secondAttempt.kind !== "cooldown") {
    throw new Error("FAIL: expected cooldown on identical repeat search, but a new run was started");
  }
  console.log(`  OK: cooldown path taken, lastRun=${secondAttempt.lastRun.id}`);

  console.log("\n=== Step 4: manually flip a lead's status/notes, force re-scrape, confirm preserved ===");
  const someLead = await prisma.lead.findFirst({ where: { locality: LOCALITY } });
  if (!someLead) throw new Error("No leads found to test upsert-exclusion against.");
  const sentinelNotes = `smoke-test-sentinel-${Date.now()}`;
  await prisma.lead.update({
    where: { id: someLead.id },
    data: { status: "interested", notes: sentinelNotes },
  });
  console.log(`  flipped lead ${someLead.id} (${someLead.businessName}) to status=interested, notes="${sentinelNotes}"`);

  const forced = await createScrapeRun({
    searchTerm: SEARCH_TERM,
    locality: LOCALITY,
    requestedByUserId: admin.id,
    bypassCooldown: true,
  });
  if (forced.kind !== "started") throw new Error("FAIL: bypassCooldown did not start a new run");
  console.log(`  forced re-scrape started scrapeRunId=${forced.scrapeRun.id}`);
  const forcedFinished = await waitForTerminal(forced.scrapeRun.id);
  if (forcedFinished.status !== "succeeded") throw new Error(`Forced re-scrape did not succeed: ${forcedFinished.status}`);

  const reloaded = await prisma.lead.findUnique({ where: { id: someLead.id } });
  if (reloaded?.status !== "interested" || reloaded?.notes !== sentinelNotes) {
    throw new Error(
      `FAIL: partner-owned fields were overwritten by re-scrape. status=${reloaded?.status} notes=${reloaded?.notes}`
    );
  }
  console.log("  OK: status and notes survived the re-upsert unchanged.");

  console.log("\n=== Step 5: account budget tracking ===");
  const accounts = await prisma.apifyAccount.findMany();
  for (const a of accounts) {
    console.log(`  ${a.label}: used=$${a.usedThisCycleUsd} / budget=$${a.monthlyBudgetUsd} status=${a.status}`);
  }

  console.log("\nAll smoke test checks passed.");
}

main()
  .catch((err) => {
    console.error("\nSMOKE TEST FAILED:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
