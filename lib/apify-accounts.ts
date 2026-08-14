import { prisma } from "./prisma";
import type { ApifyAccount } from "@prisma/client";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export async function resetCycleIfNeeded(account: ApifyAccount): Promise<ApifyAccount> {
  const now = new Date();
  if (now < account.cycleResetDate) {
    return account;
  }
  let nextReset = account.cycleResetDate;
  while (nextReset <= now) {
    nextReset = addMonths(nextReset, 1);
  }
  return prisma.apifyAccount.update({
    where: { id: account.id },
    data: {
      usedThisCycleUsd: 0,
      cycleResetDate: nextReset,
      status: "active",
    },
  });
}

export function getAccountToken(account: ApifyAccount): string {
  const token = process.env[account.tokenEnvVar];
  if (!token) {
    throw new Error(`Env var ${account.tokenEnvVar} is not set for Apify account ${account.label}`);
  }
  return token;
}

export async function markAccountExhausted(accountId: string): Promise<void> {
  await prisma.apifyAccount.update({
    where: { id: accountId },
    data: { status: "exhausted" },
  });
}

export async function listAccountsWithLiveState(): Promise<ApifyAccount[]> {
  const accounts = await prisma.apifyAccount.findMany({ orderBy: { label: "asc" } });
  return Promise.all(accounts.map(resetCycleIfNeeded));
}

export type SerializedApifyAccount = Omit<
  ApifyAccount,
  "monthlyBudgetUsd" | "usedThisCycleUsd" | "cycleResetDate" | "createdAt" | "updatedAt"
> & {
  monthlyBudgetUsd: number;
  usedThisCycleUsd: number;
  cycleResetDate: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeApifyAccount(account: ApifyAccount): SerializedApifyAccount {
  return {
    ...account,
    monthlyBudgetUsd: Number(account.monthlyBudgetUsd),
    usedThisCycleUsd: Number(account.usedThisCycleUsd),
    cycleResetDate: account.cycleResetDate.toISOString(),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
