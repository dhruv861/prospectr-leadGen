"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Phone,
  MessageCircle,
  MapPin,
  ChevronDown,
  Clock,
  CalendarClock,
  Sparkles,
  Search,
  Globe,
  Pickaxe,
} from "lucide-react";
import type { SerializedLead } from "@/lib/leads";
import type { PitchIdeas, PitchIdea, Opportunities, ReviewPainPoints } from "@/lib/gemini";
import { toWhatsAppLink } from "@/lib/phone";
import { formatDateTime, formatRelativeTime, toLocalInputValue, toLocalDateInputValue } from "@/lib/format";
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_BADGE_COLOR,
  WEBSITE_STATUS_LABEL,
  WEBSITE_STATUS_BADGE_COLOR,
  type LeadStatusValue,
} from "@/lib/constants";
import Card from "@/components/ui/Card";
import Badge, { type BadgeColor } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const PITCH_CATEGORY_LABEL: Record<PitchIdea["category"], string> = {
  website: "Website",
  web_app: "Web App",
  ai_workflow: "AI Workflow",
  other: "Other",
};

const PITCH_CATEGORY_COLOR: Record<PitchIdea["category"], BadgeColor> = {
  website: "indigo",
  web_app: "purple",
  ai_workflow: "green",
  other: "gray",
};

export default function LeadDetailView({ lead: initialLead }: { lead: SerializedLead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const waLink = toWhatsAppLink(lead.phone);
  const shortlisted = lead.shortlistedAt !== null;

  const [statusSaving, setStatusSaving] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [lastContactedAt, setLastContactedAt] = useState(toLocalInputValue(lead.lastContactedAt));
  const [followUpAt, setFollowUpAt] = useState(toLocalDateInputValue(lead.followUpAt));
  const [notesSaving, setNotesSaving] = useState(false);
  const canScheduleFollowUp = lead.status !== "new";

  const [pitchIdeas, setPitchIdeas] = useState<PitchIdeas | null>(lead.pitchIdeas as PitchIdeas | null);
  const [pitchGenerating, setPitchGenerating] = useState(false);
  const [pitchError, setPitchError] = useState<string | null>(null);

  const [opportunities, setOpportunities] = useState<Opportunities | null>(lead.opportunities as Opportunities | null);
  const [opportunitiesGenerating, setOpportunitiesGenerating] = useState(false);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);

  const [reviewPainPoints, setReviewPainPoints] = useState<ReviewPainPoints | null>(
    lead.reviewPainPoints as ReviewPainPoints | null
  );
  const [reviewPainPointsGenerating, setReviewPainPointsGenerating] = useState(false);
  const [reviewPainPointsError, setReviewPainPointsError] = useState<string | null>(null);

  async function patchLead(body: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("update failed");
    const data = await res.json();
    setLead(data.lead);
    router.refresh();
    return data.lead as SerializedLead;
  }

  async function handleStatusChange(newStatus: string) {
    setStatusSaving(true);
    try {
      await patchLead(newStatus === "new" ? { status: newStatus, followUpAt: null } : { status: newStatus });
      if (newStatus === "new") setFollowUpAt("");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleToggleShortlist() {
    setStatusSaving(true);
    try {
      await patchLead({ shortlistedAt: shortlisted ? null : new Date().toISOString() });
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      await patchLead({
        notes: notes.trim() === "" ? null : notes,
        lastContactedAt: lastContactedAt === "" ? null : new Date(lastContactedAt).toISOString(),
        followUpAt: canScheduleFollowUp && followUpAt !== "" ? new Date(followUpAt).toISOString() : null,
      });
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleGeneratePitch() {
    setPitchGenerating(true);
    setPitchError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/pitch`, { method: "POST" });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setLead(data.lead);
      setPitchIdeas(data.lead.pitchIdeas);
    } catch {
      setPitchError("Couldn't generate pitch ideas. Try again in a moment.");
    } finally {
      setPitchGenerating(false);
    }
  }

  async function handleFindOpportunities() {
    setOpportunitiesGenerating(true);
    setOpportunitiesError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/opportunities`, { method: "POST" });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setLead(data.lead);
      setOpportunities(data.lead.opportunities);
    } catch {
      setOpportunitiesError("Couldn't research this business. Try again in a moment.");
    } finally {
      setOpportunitiesGenerating(false);
    }
  }

  async function handleMineReviewPainPoints() {
    setReviewPainPointsGenerating(true);
    setReviewPainPointsError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/review-pain-points`, { method: "POST" });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setLead(data.lead);
      setReviewPainPoints(data.lead.reviewPainPoints);
    } catch {
      setReviewPainPointsError("Couldn't mine reviews for this business. Try again in a moment.");
    } finally {
      setReviewPainPointsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{lead.businessName}</h1>
              <Badge color={STATUS_BADGE_COLOR[lead.status as LeadStatusValue]}>
                {STATUS_LABELS[lead.status as LeadStatusValue]}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {lead.category ?? "—"} · {lead.locality}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={statusSaving}
              onClick={handleToggleShortlist}
              title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            >
              <Star className={`h-4 w-4 ${shortlisted ? "fill-amber-400 text-amber-400" : ""}`} />
              {shortlisted ? "Shortlisted" : "Shortlist"}
            </Button>
            <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4" /> Open in Maps
              </Button>
            </a>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Address">{lead.address}</Field>
          <Field label="Rating">
            {lead.rating != null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {lead.rating} ({lead.reviewCount ?? 0} reviews)
              </span>
            ) : (
              "No rating data"
            )}
          </Field>
          <Field label="Website">
            {lead.websiteUrl ? (
              <a
                href={lead.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                <Badge color={WEBSITE_STATUS_BADGE_COLOR[lead.websiteStatus]}>
                  {WEBSITE_STATUS_LABEL[lead.websiteStatus]}
                </Badge>
              </a>
            ) : (
              <Badge color={WEBSITE_STATUS_BADGE_COLOR[lead.websiteStatus]}>
                {WEBSITE_STATUS_LABEL[lead.websiteStatus]}
              </Badge>
            )}
          </Field>
          <Field label="Contact">
            {lead.phone ? (
              <div className="flex items-center gap-2">
                <span>{lead.phone}</span>
                <a href={`tel:${lead.phone}`} title="Call" className="text-slate-400 hover:text-indigo-600">
                  <Phone className="h-4 w-4" />
                </a>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-slate-400 hover:text-emerald-600">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            ) : (
              "No phone on file"
            )}
          </Field>
          <Field label="Status">
            <div className="relative inline-block">
              <select
                value={lead.status}
                disabled={statusSaving}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </Field>
          <Field label="Last updated">{formatDateTime(lead.updatedAt)}</Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Notes &amp; Follow-up</h2>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What did you learn from this lead?"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Last contacted</label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="datetime-local"
                value={lastContactedAt}
                onChange={(e) => setLastContactedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Follow-up date</label>
            {canScheduleFollowUp ? (
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Set a status other than &quot;New&quot; to schedule a follow-up.
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={handleSaveNotes} disabled={notesSaving}>
            {notesSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Pitch Ideas</h2>
          </div>
          <div className="flex items-center gap-2">
            {lead.pitchIdeasGeneratedAt && (
              <span className="text-xs text-slate-400">generated {formatRelativeTime(lead.pitchIdeasGeneratedAt)}</span>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={handleGeneratePitch} disabled={pitchGenerating}>
              {pitchGenerating ? "Generating..." : pitchIdeas ? "Regenerate" : "Generate Pitch Ideas"}
            </Button>
          </div>
        </div>
        {pitchError && <p className="mb-3 text-xs text-red-600">{pitchError}</p>}
        {pitchIdeas && pitchIdeas.ideas.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pitchIdeas.ideas.map((idea, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{idea.title}</p>
                  <Badge color={PITCH_CATEGORY_COLOR[idea.category]} className="flex-shrink-0">
                    {PITCH_CATEGORY_LABEL[idea.category]}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{idea.pitch}</p>
              </div>
            ))}
          </div>
        ) : (
          !pitchGenerating && (
            <p className="text-sm text-slate-400">
              Generate a few sales angles based on this lead&apos;s scraped details — no web search, quick and cheap.
            </p>
          )
        )}
        {pitchIdeas && pitchIdeas.objections && pitchIdeas.objections.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Likely Objections</p>
            <div className="space-y-2">
              {pitchIdeas.objections.map((o, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs italic text-slate-500">&quot;{o.objection}&quot;</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{o.response}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Find Opportunities</h2>
          </div>
          <div className="flex items-center gap-2">
            {lead.opportunitiesGeneratedAt && (
              <span className="text-xs text-slate-400">
                generated {formatRelativeTime(lead.opportunitiesGeneratedAt)}
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleFindOpportunities}
              disabled={opportunitiesGenerating}
            >
              {opportunitiesGenerating ? "Researching..." : opportunities ? "Regenerate" : "Find Opportunities"}
            </Button>
          </div>
        </div>
        {opportunitiesGenerating && (
          <p className="mb-3 text-xs text-slate-400">
            Searching the web for this business — this can take a minute or more.
          </p>
        )}
        {opportunitiesError && <p className="mb-3 text-xs text-red-600">{opportunitiesError}</p>}
        {opportunities ? (
          <div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{opportunities.summary}</p>
            {opportunities.sources.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Sources</p>
                <ul className="space-y-1">
                  {opportunities.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{source.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          !opportunitiesGenerating && (
            <p className="text-sm text-slate-400">
              Have AI research this business live on the web and list concrete gaps we could pitch a website, web app,
              or AI workflow to solve.
            </p>
          )
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pickaxe className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Review Pain Points</h2>
          </div>
          <div className="flex items-center gap-2">
            {lead.reviewPainPointsGeneratedAt && (
              <span className="text-xs text-slate-400">
                generated {formatRelativeTime(lead.reviewPainPointsGeneratedAt)}
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleMineReviewPainPoints}
              disabled={reviewPainPointsGenerating}
            >
              {reviewPainPointsGenerating ? "Mining reviews..." : reviewPainPoints ? "Regenerate" : "Mine Reviews"}
            </Button>
          </div>
        </div>
        {reviewPainPointsGenerating && (
          <p className="mb-3 text-xs text-slate-400">
            Reading customer reviews on Google Maps, Justdial, Zomato, and wherever else search finds them — this can
            take a minute or two.
          </p>
        )}
        {reviewPainPointsError && <p className="mb-3 text-xs text-red-600">{reviewPainPointsError}</p>}
        {reviewPainPoints ? (
          reviewPainPoints.painPoints.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 gap-3">
                {reviewPainPoints.painPoints.map((pp, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{pp.complaint}</p>
                      <Badge color={PITCH_CATEGORY_COLOR[pp.category]} className="flex-shrink-0">
                        {PITCH_CATEGORY_LABEL[pp.category]}
                      </Badge>
                    </div>
                    <p className="mb-1.5 text-xs italic leading-relaxed text-slate-500">{pp.evidence}</p>
                    <p className="text-xs leading-relaxed text-slate-600">{pp.fix}</p>
                  </div>
                ))}
              </div>
              {reviewPainPoints.sources.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">Sources</p>
                  <ul className="space-y-1">
                    {reviewPainPoints.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                        >
                          <Globe className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{source.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Couldn&apos;t find enough genuine customer reviews for this business to identify recurring complaints.
            </p>
          )
        ) : (
          !reviewPainPointsGenerating && (
            <p className="text-sm text-slate-400">
              Search this business&apos;s real customer reviews for recurring complaints and turn each one into a
              specific, evidence-backed pitch — more concrete than Find Opportunities above.
            </p>
          )
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm text-slate-700">{children}</div>
    </div>
  );
}
