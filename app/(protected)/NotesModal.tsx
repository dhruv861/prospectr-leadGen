"use client";

import { useState } from "react";
import { X, Clock, CalendarClock } from "lucide-react";
import type { SerializedLead } from "@/lib/leads";
import { toLocalInputValue, toLocalDateInputValue } from "@/lib/format";
import Button from "@/components/ui/Button";

export default function NotesModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: SerializedLead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [lastContactedAt, setLastContactedAt] = useState(toLocalInputValue(lead.lastContactedAt));
  const [followUpAt, setFollowUpAt] = useState(toLocalDateInputValue(lead.followUpAt));
  const [saving, setSaving] = useState(false);
  const canScheduleFollowUp = lead.status !== "new";

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: notes.trim() === "" ? null : notes,
        lastContactedAt: lastContactedAt === "" ? null : new Date(lastContactedAt).toISOString(),
        followUpAt: canScheduleFollowUp && followUpAt !== "" ? new Date(followUpAt).toISOString() : null,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{lead.businessName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What did you learn from this lead?"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Last contacted</label>
        <div className="relative mb-5">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="datetime-local"
            value={lastContactedAt}
            onChange={(e) => setLastContactedAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Follow-up date</label>
        {canScheduleFollowUp ? (
          <div className="relative mb-5">
            <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        ) : (
          <p className="mb-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Set a status other than &quot;New&quot; to schedule a follow-up.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
