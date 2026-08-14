"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import type { SerializedApifyAccount } from "@/lib/apify-accounts";
import { formatDate } from "@/lib/format";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

function progressColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function ApifyAccountsPanel({ accounts }: { accounts: SerializedApifyAccount[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleStatus(account: SerializedApifyAccount) {
    setPendingId(account.id);
    const nextStatus = account.status === "active" ? "exhausted" : "active";
    await fetch(`/api/apify-accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((a) => {
        const pct = a.monthlyBudgetUsd > 0 ? Math.min(100, (a.usedThisCycleUsd / a.monthlyBudgetUsd) * 100) : 0;
        return (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                  <Wallet className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="font-mono text-xs text-slate-400">{a.tokenEnvVar}</p>
                </div>
              </div>
              <Badge color={a.status === "active" ? "green" : "red"}>{a.status}</Badge>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between text-xs text-slate-500">
                <span>
                  ${a.usedThisCycleUsd.toFixed(2)} of ${a.monthlyBudgetUsd.toFixed(2)}
                </span>
                <span>{pct.toFixed(0)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">Resets {formatDate(a.cycleResetDate)}</p>

            <Button
              variant="secondary"
              size="sm"
              disabled={pendingId === a.id}
              onClick={() => toggleStatus(a)}
              className="mt-4 w-full"
            >
              Mark {a.status === "active" ? "exhausted" : "active"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
