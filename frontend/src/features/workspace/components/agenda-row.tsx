import { StatusBadge } from "@/components/panel/status-badge";

import { STATUS_META, isFreeSlot, type AgendaEntry } from "../types";

/** A single appointment (or free slot) row in an agenda list. */
export function AgendaRow({ entry }: { entry: AgendaEntry }) {
  if (isFreeSlot(entry)) {
    return (
      <div className="border-line grid grid-cols-[64px_1fr_auto] items-center gap-3.5 border-t px-2.5 py-[13px]">
        <span className="text-coffee/40 font-serif text-[17px]">
          {entry.time}
        </span>
        <span className="text-coffee/45 text-[13.5px] italic">
          Slobodan termin
        </span>
        <span className="border-coffee/25 text-coffee/60 rounded-full border border-dashed px-3.5 py-1.5 text-[12.5px] font-semibold">
          + Zakaži
        </span>
      </div>
    );
  }

  const meta = STATUS_META[entry.status];
  return (
    <div className="border-line grid grid-cols-[64px_1fr_auto] items-center gap-3.5 border-t px-2.5 py-[13px]">
      <span className="text-forest font-serif text-[17px]">{entry.time}</span>
      <span className="min-w-0">
        <span className="text-coffee block text-[14.5px] font-semibold">
          {entry.client}
        </span>
        <span className="text-ink-55 mt-0.5 block truncate text-[12.5px]">
          {entry.service} · {entry.format} · {entry.therapist}
        </span>
      </span>
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
    </div>
  );
}
