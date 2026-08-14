"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

type ScrapeRun = {
  id: string;
  status: "running" | "succeeded" | "failed";
  placesReturned: number | null;
  locality: string;
};

const POLL_INTERVAL_MS = 4000;

export default function PollingStatus({ scrapeRunId }: { scrapeRunId: string }) {
  const [run, setRun] = useState<ScrapeRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/scrape-runs/${scrapeRunId}`);
        if (!res.ok) throw new Error("Failed to fetch run status");
        const { scrapeRun } = await res.json();
        if (cancelled) return;
        setRun(scrapeRun);
        if (scrapeRun.status !== "running" && interval) {
          clearInterval(interval);
        }
      } catch {
        if (!cancelled) setError("Could not check search status.");
      }
    }

    poll();
    interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [scrapeRunId]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (!run || run.status === "running") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
        Searching... this can take up to a couple of minutes.
      </div>
    );
  }

  if (run.status === "failed") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        The search failed. Please try again.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        Found {run.placesReturned ?? 0} lead{run.placesReturned === 1 ? "" : "s"}
      </div>
      <Link
        href={`/leads?locality=${encodeURIComponent(run.locality)}`}
        className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        View in leads
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
