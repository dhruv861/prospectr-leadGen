"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Clock, ArrowRight, Search as SearchIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PollingStatus from "./PollingStatus";

type StartResult =
  | { kind: "started"; scrapeRunId: string }
  | { kind: "cooldown"; lastRunId: string; existingLeadsCount: number }
  | { kind: "error"; message: string };

export default function SearchForm() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locality, setLocality] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StartResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/scrape-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm, locality }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", message: data.error === "no_available_apify_account"
          ? "All Apify accounts are exhausted this cycle. Try again later or ask an admin."
          : (data.error ?? "Something went wrong.") });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ kind: "error", message: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Industry / keyword</label>
            <div className="relative">
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                required
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. dentist"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Locality</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Bandra West, Mumbai, India"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <Button type="submit" disabled={submitting}>
            <SearchIcon className="h-4 w-4" />
            {submitting ? "Starting..." : "Search"}
          </Button>
        </form>
      </Card>

      {result?.kind === "started" && <PollingStatus scrapeRunId={result.scrapeRunId} />}

      {result?.kind === "cooldown" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <Clock className="h-4 w-4 flex-shrink-0" />
            Already searched recently — {result.existingLeadsCount} leads found
          </div>
          <Link
            href={`/leads?locality=${encodeURIComponent(locality)}`}
            className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
          >
            View in leads
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {result?.kind === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.message}
        </div>
      )}
    </div>
  );
}
