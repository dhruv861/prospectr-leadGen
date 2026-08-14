"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PollingStatus from "../search/PollingStatus";

export default function ForceRefreshForm() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [locality, setLocality] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setScrapeRunId(null);
    const res = await fetch("/api/scrape-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchTerm, locality, bypassCooldown: true }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok || data.kind !== "started") {
      setError(data.error ?? "Failed to start a forced refresh.");
      return;
    }
    setScrapeRunId(data.scrapeRunId);
    router.refresh();
  }

  return (
    <Card className="space-y-3 p-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Industry / keyword</label>
          <input
            required
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Locality</label>
          <input
            required
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <Button type="submit" disabled={submitting} variant="secondary" className="border-amber-200 text-amber-700 hover:bg-amber-50">
          <RefreshCw className="h-3.5 w-3.5" />
          {submitting ? "Starting..." : "Force refresh"}
        </Button>
      </form>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {scrapeRunId && <PollingStatus scrapeRunId={scrapeRunId} />}
    </Card>
  );
}
