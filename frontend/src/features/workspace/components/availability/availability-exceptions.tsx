"use client";

import { useState } from "react";

import { formatDateSr } from "@/helpers/format-date";
import {
  useAvailabilityExceptions,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from "../../hooks/use-availability";
import {
  exceptionReasons,
  isReasonClientVisible,
  reasonLabel,
} from "../../availability-model";

interface AvailabilityExceptionsProps {
  therapistProfileId: string;
}

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Layer 3 — non-working days, annual leave and one-off absences.
 *
 * Colleagues see the reason so the team can plan; only annual leave is ever
 * shown to a client (CTO, 2026-08-09), which is why the reason list carries an
 * explicit visibility flag rather than a free-text field.
 */
export function AvailabilityExceptions({
  therapistProfileId,
}: AvailabilityExceptionsProps) {
  const [from, setFrom] = useState(() => isoDay(0));
  const [until, setUntil] = useState(() => isoDay(180));
  const [reason, setReason] = useState("vacation");

  const exceptions = useAvailabilityExceptions(therapistProfileId, from, until);
  const create = useCreateAvailabilityException();
  const remove = useDeleteAvailabilityException();

  const [newFrom, setNewFrom] = useState(() => isoDay(1));
  const [newUntil, setNewUntil] = useState(() => isoDay(1));

  const add = () => {
    create.mutate({
      therapist_profile_id: therapistProfileId,
      // Whole calendar days: the therapist is away, not away "from 09:00".
      kind: "unavailable",
      starts_at: `${newFrom}T00:00:00Z`,
      ends_at: `${newUntil}T23:59:59Z`,
      reason_code: reason,
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-card border-forest/25 bg-forest text-canvas border px-5 py-5">
        <div className="text-canvas/70 mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Dodaj neradne dane
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Od
            <input
              type="date"
              value={newFrom}
              onChange={(event) => setNewFrom(event.target.value)}
              className="border-canvas/30 text-canvas min-h-9 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Do
            <input
              type="date"
              value={newUntil}
              onChange={(event) => setNewUntil(event.target.value)}
              className="border-canvas/30 text-canvas min-h-9 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Razlog
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="border-canvas/30 text-canvas min-h-9 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            >
              {exceptionReasons.map((item) => (
                <option
                  key={item.code}
                  value={item.code}
                  className="text-coffee"
                >
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={add}
            disabled={create.isPending || newUntil < newFrom}
            className="bg-canvas text-forest min-h-9 cursor-pointer rounded-full px-5 text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {create.isPending ? "Dodajem…" : "Dodaj"}
          </button>
        </div>
        <p className="text-canvas/70 mt-3 text-[12.5px] leading-[1.5]">
          {isReasonClientVisible(reason)
            ? "Klijenti će videti da ste na godišnjem odmoru."
            : "Klijenti neće videti razlog — samo da termin nije dostupan. Kolege vide razlog."}
        </p>
      </div>

      <div className="rounded-card border-line bg-surface border px-5 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="text-sage text-[11.5px] font-semibold tracking-[0.14em] uppercase">
            Upisani izuzeci
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="date"
              aria-label="Prikaži od"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border-line text-coffee min-h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none"
            />
            <input
              type="date"
              aria-label="Prikaži do"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
              className="border-line text-coffee min-h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none"
            />
          </div>
        </div>

        {exceptions.isPending ? (
          <p className="text-ink-55 text-[13px]">Učitavanje…</p>
        ) : exceptions.isError ? (
          <p className="text-badge-danger text-[13px] font-semibold">
            Izuzeci nisu mogli da se učitaju.
          </p>
        ) : (exceptions.data ?? []).length === 0 ? (
          <p className="text-ink-55 text-[13px]">
            Nema upisanih neradnih dana u ovom periodu.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(exceptions.data ?? []).map((item) => (
              <li
                key={item.id}
                className="border-line flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <span className="text-coffee text-[13.5px] font-semibold">
                  {formatDateSr(item.starts_at.slice(0, 10))} –{" "}
                  {formatDateSr(item.ends_at.slice(0, 10))}
                </span>
                <span className="text-ink-55 text-[12.5px]">
                  {reasonLabel(item.reason_code)}
                  {isReasonClientVisible(item.reason_code)
                    ? " · vidljivo klijentima"
                    : " · samo interno"}
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate(item.id)}
                  className="text-badge-danger border-line hover:border-badge-danger/50 min-h-9 cursor-pointer rounded-lg border px-3 text-[12.5px] font-semibold transition-colors"
                >
                  Obriši
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
