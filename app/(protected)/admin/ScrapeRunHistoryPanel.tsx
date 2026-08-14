import type { SerializedScrapeRun } from "@/lib/scrape-runs";
import { formatDateTime } from "@/lib/format";
import Badge, { type BadgeColor } from "@/components/ui/Badge";

const STATUS_COLOR: Record<string, BadgeColor> = {
  running: "blue",
  succeeded: "green",
  failed: "red",
};

const TH_CLASS = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function ScrapeRunHistoryPanel({ runs }: { runs: SerializedScrapeRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        No searches yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className={TH_CLASS}>Search</th>
            <th className={TH_CLASS}>Requested by</th>
            <th className={TH_CLASS}>Account</th>
            <th className={TH_CLASS}>Places</th>
            <th className={TH_CLASS}>Cost</th>
            <th className={TH_CLASS}>Status</th>
            <th className={TH_CLASS}>Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {runs.map((run) => (
            <tr key={run.id} className="transition-colors hover:bg-slate-50">
              <td className="px-3 py-2.5 font-medium text-slate-900">
                {run.searchTerm} <span className="font-normal text-slate-400">in</span> {run.locality}
              </td>
              <td className="px-3 py-2.5 text-slate-600">{run.requestedBy.name}</td>
              <td className="px-3 py-2.5 text-slate-600">{run.apifyAccount.label}</td>
              <td className="px-3 py-2.5 text-slate-600">{run.placesReturned ?? "—"}</td>
              <td className="px-3 py-2.5 text-slate-600">
                {run.estimatedCostUsd != null ? `$${run.estimatedCostUsd.toFixed(4)}` : "—"}
              </td>
              <td className="px-3 py-2.5">
                <Badge color={STATUS_COLOR[run.status] ?? "gray"}>{run.status}</Badge>
              </td>
              <td className="px-3 py-2.5 text-slate-500">{formatDateTime(run.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
