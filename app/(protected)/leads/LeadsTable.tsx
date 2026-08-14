"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Phone, MessageCircle, StickyNote, ChevronDown, ExternalLink, MapPin } from "lucide-react";
import type { SerializedLead } from "@/lib/leads";
import { toWhatsAppLink } from "@/lib/phone";
import { STATUS_OPTIONS, STATUS_LABELS, WEBSITE_STATUS_LABEL, WEBSITE_STATUS_BADGE_COLOR } from "@/lib/constants";
import Badge from "@/components/ui/Badge";
import NotesModal from "../NotesModal";

const TH_CLASS = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";

type SharedProps = {
  pendingId: string | null;
  updateStatus: (id: string, status: string) => void;
  toggleShortlist: (id: string, currentlyShortlisted: boolean) => void;
  onOpenNotes: (lead: SerializedLead) => void;
};

export default function LeadsTable({ leads }: { leads: SerializedLead[] }) {
  const router = useRouter();
  const [notesLead, setNotesLead] = useState<SerializedLead | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setPendingId(id);
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // Follow-up dates only make sense once a lead has moved past "new" —
      // clear any scheduled follow-up if it's moved back.
      body: JSON.stringify(status === "new" ? { status, followUpAt: null } : { status }),
    });
    setPendingId(null);
    router.refresh();
  }

  async function toggleShortlist(id: string, currentlyShortlisted: boolean) {
    setPendingId(id);
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortlistedAt: currentlyShortlisted ? null : new Date().toISOString() }),
    });
    setPendingId(null);
    router.refresh();
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-900">No leads match these filters</p>
        <p className="mt-1 text-sm text-slate-500">Try widening your search or clearing a filter.</p>
      </div>
    );
  }

  const shared: SharedProps = { pendingId, updateStatus, toggleShortlist, onOpenNotes: setNotesLead };

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 lg:hidden">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} {...shared} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className={TH_CLASS} title="Shortlist"></th>
              <th className={TH_CLASS}>Business</th>
              <th className={TH_CLASS}>Category</th>
              <th className={TH_CLASS}>Locality</th>
              <th className={TH_CLASS}>Website</th>
              <th className={TH_CLASS}>Contact</th>
              <th className={TH_CLASS}>Rating</th>
              <th className={TH_CLASS}>Status</th>
              <th className={TH_CLASS}>Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const waLink = toWhatsAppLink(lead.phone);
              const shortlisted = lead.shortlistedAt !== null;
              return (
                <tr
                  key={lead.id}
                  className={`transition-colors hover:bg-slate-50 ${
                    shortlisted ? "border-l-2 border-l-amber-400 bg-amber-50/40" : "border-l-2 border-l-transparent"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      disabled={pendingId === lead.id}
                      onClick={() => toggleShortlist(lead.id, shortlisted)}
                      title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-amber-500 disabled:opacity-50"
                    >
                      <Star className={`h-4 w-4 ${shortlisted ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={lead.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {lead.businessName}
                      <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-indigo-400" />
                    </a>
                    <div className="max-w-xs truncate text-xs text-slate-400">{lead.address}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{lead.category ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600">{lead.locality}</td>
                  <td className="px-3 py-2.5">
                    {lead.websiteUrl ? (
                      <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <Badge color={WEBSITE_STATUS_BADGE_COLOR[lead.websiteStatus]}>
                          {WEBSITE_STATUS_LABEL[lead.websiteStatus]}
                        </Badge>
                      </a>
                    ) : (
                      <Badge color={WEBSITE_STATUS_BADGE_COLOR[lead.websiteStatus]}>
                        {WEBSITE_STATUS_LABEL[lead.websiteStatus]}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {lead.phone ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${lead.phone}`}
                          title="Call"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">No phone</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {lead.rating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {lead.rating} ({lead.reviewCount ?? 0})
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="relative">
                      <select
                        value={lead.status}
                        disabled={pendingId === lead.id}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setNotesLead(lead)}
                      title={lead.notes ?? "Add notes"}
                      className="flex max-w-[180px] items-center gap-1.5 rounded-md px-1 py-1 text-slate-600 hover:bg-slate-100"
                    >
                      <StickyNote
                        className={`h-4 w-4 flex-shrink-0 ${lead.notes ? "fill-amber-100 text-amber-500" : "text-slate-400"}`}
                      />
                      {lead.notes ? (
                        <span className="truncate text-xs">{lead.notes}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Add notes</span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {notesLead && (
        <NotesModal
          lead={notesLead}
          onClose={() => setNotesLead(null)}
          onSaved={() => {
            setNotesLead(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function LeadCard({
  lead,
  pendingId,
  updateStatus,
  toggleShortlist,
  onOpenNotes,
}: SharedProps & { lead: SerializedLead }) {
  const waLink = toWhatsAppLink(lead.phone);
  const shortlisted = lead.shortlistedAt !== null;

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        shortlisted ? "border-l-4 border-l-amber-400 border-y-slate-200 border-r-slate-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <a
            href={lead.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-base font-medium text-slate-900"
          >
            {lead.businessName}
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
          </a>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {lead.category ?? "—"} · {lead.locality}
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={pendingId === lead.id}
          onClick={() => toggleShortlist(lead.id, shortlisted)}
          title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-amber-500 disabled:opacity-50"
        >
          <Star className={`h-5 w-5 ${shortlisted ? "fill-amber-400 text-amber-400" : ""}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {lead.websiteUrl ? (
          <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer">
            <Badge color={WEBSITE_STATUS_BADGE_COLOR[lead.websiteStatus]}>{WEBSITE_STATUS_LABEL[lead.websiteStatus]}</Badge>
          </a>
        ) : (
          <Badge color={WEBSITE_STATUS_BADGE_COLOR[lead.websiteStatus]}>{WEBSITE_STATUS_LABEL[lead.websiteStatus]}</Badge>
        )}
        {lead.rating != null && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {lead.rating} ({lead.reviewCount ?? 0})
          </span>
        )}
      </div>

      {lead.notes && (
        <button
          type="button"
          onClick={() => onOpenNotes(lead)}
          className="mt-3 flex w-full items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-left text-xs text-amber-900"
        >
          <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-amber-100 text-amber-500" />
          <span className="line-clamp-2">{lead.notes}</span>
        </button>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        {lead.phone ? (
          <>
            <a
              href={`tel:${lead.phone}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            >
              <Phone className="h-[18px] w-[18px]" />
            </a>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </a>
            )}
          </>
        ) : (
          <span className="px-1 text-xs text-slate-400">No phone</span>
        )}
        <button
          type="button"
          onClick={() => onOpenNotes(lead)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
        >
          <StickyNote className={`h-[18px] w-[18px] ${lead.notes ? "fill-amber-100 text-amber-500" : ""}`} />
        </button>

        <div className="relative ml-auto">
          <select
            value={lead.status}
            disabled={pendingId === lead.id}
            onChange={(e) => updateStatus(lead.id, e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
