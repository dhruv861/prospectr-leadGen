"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, CalendarClock } from "lucide-react";
import type { SerializedLead } from "@/lib/leads";
import { toWhatsAppLink } from "@/lib/phone";
import { getFollowUpUrgency, formatFollowUpLabel, type FollowUpUrgency } from "@/lib/format";
import Badge, { type BadgeColor } from "@/components/ui/Badge";
import NotesModal from "../NotesModal";

const URGENCY_BADGE_COLOR: Record<FollowUpUrgency, BadgeColor> = {
  overdue: "red",
  today: "amber",
  upcoming: "gray",
};

const URGENCY_DOT_COLOR: Record<FollowUpUrgency, string> = {
  overdue: "bg-red-500",
  today: "bg-amber-500",
  upcoming: "bg-slate-300",
};

export default function FollowUpsPanel({ leads }: { leads: SerializedLead[] }) {
  const router = useRouter();
  const [notesLead, setNotesLead] = useState<SerializedLead | null>(null);

  if (leads.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Follow-ups</h2>
        </div>
        <div className="space-y-2">
          {leads.map((lead) => {
            const waLink = toWhatsAppLink(lead.phone);
            const urgency = getFollowUpUrgency(lead.followUpAt as string);
            return (
              <div
                key={lead.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
              >
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${URGENCY_DOT_COLOR[urgency]}`} />
                <button type="button" onClick={() => setNotesLead(lead)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-slate-900">{lead.businessName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {lead.category ?? "—"} · {lead.locality}
                  </p>
                </button>
                <Badge color={URGENCY_BADGE_COLOR[urgency]}>{formatFollowUpLabel(lead.followUpAt as string)}</Badge>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    title="Call"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
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
