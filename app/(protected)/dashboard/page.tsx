import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/leads";
import KanbanBoard from "./KanbanBoard";
import FollowUpsPanel from "./FollowUpsPanel";

export default async function DashboardPage() {
  const leads = await prisma.lead.findMany({
    where: { shortlistedAt: { not: null } },
    orderBy: { shortlistedAt: "desc" },
  });
  const serializedLeads = leads.map(serializeLead);
  const followUpLeads = serializedLeads
    .filter((l) => l.followUpAt !== null)
    .sort((a, b) => (a.followUpAt as string).localeCompare(b.followUpAt as string));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {leads.length} shortlisted lead{leads.length === 1 ? "" : "s"} in your pipeline
        </p>
      </div>
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <Sparkles className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900">No shortlisted leads yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Star leads from the Leads page to start tracking them through your pipeline here.
          </p>
          <Link
            href="/leads"
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
          >
            Browse leads
          </Link>
        </div>
      ) : (
        <>
          <FollowUpsPanel leads={followUpLeads} />
          <KanbanBoard leads={serializedLeads} />
        </>
      )}
    </div>
  );
}
