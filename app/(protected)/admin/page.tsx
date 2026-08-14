import { Wallet, History, RefreshCw } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { listAccountsWithLiveState, serializeApifyAccount } from "@/lib/apify-accounts";
import { serializeScrapeRun } from "@/lib/scrape-runs";
import ApifyAccountsPanel from "./ApifyAccountsPanel";
import ScrapeRunHistoryPanel from "./ScrapeRunHistoryPanel";
import ForceRefreshForm from "./ForceRefreshForm";

function SectionHeading({ icon: Icon, children }: { icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <Icon className="h-4 w-4 text-slate-400" />
      {children}
    </h2>
  );
}

export default async function AdminPage() {
  await requireAdmin();

  const [accounts, runs] = await Promise.all([
    listAccountsWithLiveState(),
    prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        requestedBy: { select: { name: true } },
        apifyAccount: { select: { label: true } },
      },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Apify account budgets and scrape run history.</p>
      </div>

      <section className="space-y-3">
        <SectionHeading icon={Wallet}>Apify accounts</SectionHeading>
        <ApifyAccountsPanel accounts={accounts.map(serializeApifyAccount)} />
      </section>

      <section className="space-y-3">
        <SectionHeading icon={RefreshCw}>Force refresh (bypass cooldown)</SectionHeading>
        <ForceRefreshForm />
      </section>

      <section className="space-y-3">
        <SectionHeading icon={History}>Scrape run history</SectionHeading>
        <ScrapeRunHistoryPanel runs={runs.map(serializeScrapeRun)} />
      </section>
    </div>
  );
}
