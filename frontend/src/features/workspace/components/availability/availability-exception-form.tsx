"use client";

import { useState } from "react";

import { Toggle } from "@/components/panel/toggle";

import {
  exceptionReasons,
  isReasonClientVisible,
} from "../../availability-model";

export interface ExceptionDraft {
  from: string;
  until: string;
  reasonCode: string;
  note: string;
  clientVisible: boolean;
}

interface AvailabilityExceptionFormProps {
  /** `manual_slots` has no interval-based extra availability (ADR-015 §2.7.4). */
  manualMode: boolean;
  isSubmitting: boolean;
  onSubmit: (draft: ExceptionDraft) => void;
}

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Layer 3 entry form.
 *
 * Visibility is a decision per record, not a property of the reason (D-072):
 * annual leave is pre-checked, but a therapist may also want a longer absence
 * to be visible so clients know they are away and have not stopped working.
 * The note is never part of that — it stays internal whatever the toggle says.
 */
export function AvailabilityExceptionForm({
  manualMode,
  isSubmitting,
  onSubmit,
}: AvailabilityExceptionFormProps) {
  const [from, setFrom] = useState(() => isoDay(1));
  const [until, setUntil] = useState(() => isoDay(1));
  const [reasonCode, setReasonCode] = useState("vacation");
  const [note, setNote] = useState("");
  const [clientVisible, setClientVisible] = useState(true);

  const pickReason = (code: string) => {
    setReasonCode(code);
    // The reason only seeds the toggle; the therapist stays in control.
    setClientVisible(isReasonClientVisible(code));
  };

  return (
    <div className="rounded-card border-forest/25 bg-forest text-canvas border px-5 py-5">
      <div className="text-canvas/70 mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
        Dodaj neradne dane
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Od
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="border-canvas/30 text-canvas min-h-11 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Do
          <input
            type="date"
            value={until}
            onChange={(event) => setUntil(event.target.value)}
            className="border-canvas/30 text-canvas min-h-11 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Razlog
          <select
            value={reasonCode}
            onChange={(event) => pickReason(event.target.value)}
            className="border-canvas/30 text-canvas min-h-11 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
          >
            {exceptionReasons.map((item) => (
              <option key={item.code} value={item.code} className="text-coffee">
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12.5px] font-semibold">
          Napomena (interno)
          <input
            type="text"
            maxLength={200}
            value={note}
            placeholder="npr. Konferencija · Beograd"
            onChange={(event) => setNote(event.target.value)}
            className="border-canvas/30 text-canvas placeholder:text-canvas/40 min-h-11 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
          />
        </label>
      </div>

      <div className="border-canvas/20 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex items-center gap-3">
          <Toggle
            checked={clientVisible}
            label="Vidljivo klijentima"
            onChange={setClientVisible}
          />
          <span className="text-[12.5px] font-semibold">
            Vidljivo klijentima
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            onSubmit({ from, until, reasonCode, note, clientVisible })
          }
          disabled={isSubmitting || until < from}
          className="bg-canvas text-forest min-h-11 cursor-pointer rounded-full px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Dodajem…" : "Dodaj"}
        </button>
      </div>

      <p className="text-canvas/70 mt-3 text-[12.5px] leading-[1.5]">
        {clientVisible
          ? "Klijenti će videti da ste odsutni u ovom periodu i razlog — ne i napomenu."
          : "Klijenti neće videti ni razlog ni napomenu, samo da termin nije dostupan. Kolege vide oboje."}
      </p>

      {manualMode ? (
        <p className="text-canvas/70 mt-2 text-[12.5px] leading-[1.5]">
          U ručnom režimu dodatni termini se ne unose kao izuzetak — dodajte ih
          u tabu Termini.
        </p>
      ) : null}
    </div>
  );
}
