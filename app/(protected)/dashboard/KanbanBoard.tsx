"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Star, StickyNote, MapPin, ChevronDown, CalendarClock } from "lucide-react";
import type { SerializedLead } from "@/lib/leads";
import { toWhatsAppLink } from "@/lib/phone";
import { getFollowUpUrgency, formatFollowUpLabel, type FollowUpUrgency } from "@/lib/format";
import { STATUS_OPTIONS, STATUS_LABELS, STATUS_COLUMN_STYLES, type LeadStatusValue } from "@/lib/constants";
import NotesModal from "../NotesModal";

const FOLLOWUP_TEXT_COLOR: Record<FollowUpUrgency, string> = {
  overdue: "text-red-600",
  today: "text-amber-600",
  upcoming: "text-slate-500",
};

// The dashboard page takes no filters/search params, so this component only
// ever mounts fresh with a new `initialLeads` snapshot — no prop-sync effect
// or remount-via-key needed to keep local drag state in sync.
export default function KanbanBoard({ leads: initialLeads }: { leads: SerializedLead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [notesLead, setNotesLead] = useState<SerializedLead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatusValue | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function moveLead(leadId: string, newStatus: LeadStatusValue) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const previousStatus = lead.status;
    const previousFollowUpAt = lead.followUpAt;
    // Follow-up dates only make sense once a lead has moved past "new" — clear
    // any scheduled follow-up if it's moved back.
    const clearFollowUp = newStatus === "new";
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, followUpAt: clearFollowUp ? null : l.followUpAt } : l))
    );
    setMovingId(leadId);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clearFollowUp ? { status: newStatus, followUpAt: null } : { status: newStatus }),
      });
      if (!res.ok) throw new Error("update failed");
      router.refresh();
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus, followUpAt: previousFollowUpAt } : l))
      );
    } finally {
      setMovingId(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, status: LeadStatusValue) {
    e.preventDefault();
    setDragOverStatus(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) moveLead(leadId, status);
  }

  return (
    <>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {STATUS_OPTIONS.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status);
          const styles = STATUS_COLUMN_STYLES[status];
          const isDragOver = dragOverStatus === status;
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === status ? null : s))}
              onDrop={(e) => handleDrop(e, status)}
              className={`flex w-[85vw] flex-shrink-0 snap-center flex-col rounded-xl border transition-colors sm:w-72 sm:snap-align-none ${
                isDragOver ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                <span className={`text-sm font-semibold ${styles.header}`}>{STATUS_LABELS[status]}</span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                  {columnLeads.length}
                </span>
              </div>
              <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                {columnLeads.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-slate-400">Drop a lead here</p>
                )}
                {columnLeads.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    dragging={movingId === lead.id}
                    onOpenNotes={() => setNotesLead(lead)}
                    onMove={(newStatus) => moveLead(lead.id, newStatus)}
                  />
                ))}
              </div>
            </div>
          );
        })}
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

function KanbanCard({
  lead,
  dragging,
  onOpenNotes,
  onMove,
}: {
  lead: SerializedLead;
  dragging: boolean;
  onOpenNotes: () => void;
  onMove: (status: LeadStatusValue) => void;
}) {
  const waLink = toWhatsAppLink(lead.phone);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
          {lead.businessName}
        </Link>
        {lead.shortlistedAt && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-400" />}
      </div>
      <div className="mt-1 flex items-center gap-1 text-slate-500">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">
          {lead.category ?? "—"} · {lead.locality}
        </span>
      </div>
      {lead.rating != null && (
        <div className="mt-1 flex items-center gap-1 text-slate-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {lead.rating} ({lead.reviewCount ?? 0})
        </div>
      )}
      {lead.followUpAt && (
        <div className={`mt-1 flex items-center gap-1 font-medium ${FOLLOWUP_TEXT_COLOR[getFollowUpUrgency(lead.followUpAt)]}`}>
          <CalendarClock className="h-3 w-3 flex-shrink-0" />
          {formatFollowUpLabel(lead.followUpAt)}
        </div>
      )}
      {lead.notes && (
        <button
          type="button"
          onClick={onOpenNotes}
          className="mt-2 flex w-full items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-left text-amber-900"
        >
          <StickyNote className="mt-0.5 h-3 w-3 flex-shrink-0 fill-amber-100 text-amber-500" />
          <span className="line-clamp-2">{lead.notes}</span>
        </button>
      )}
      <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
        {lead.phone ? (
          <>
            <a
              href={`tel:${lead.phone}`}
              title="Call"
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            >
              <Phone className="h-4 w-4" />
            </a>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </>
        ) : (
          <span className="px-1 text-slate-400">No phone</span>
        )}
        <button
          type="button"
          onClick={onOpenNotes}
          title={lead.notes ? "Edit notes" : "Add notes"}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
        >
          <StickyNote className={`h-4 w-4 ${lead.notes ? "fill-amber-100" : ""}`} />
        </button>

        <div className="relative ml-auto">
          <select
            value={lead.status}
            onChange={(e) => onMove(e.target.value as LeadStatusValue)}
            className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
