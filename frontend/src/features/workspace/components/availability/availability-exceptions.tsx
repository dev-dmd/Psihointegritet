"use client";

import { useState } from "react";

import { formatDateSr } from "@/helpers/format-date";
import type { Appointment } from "@/lib/api/booking";
import {
  useAvailabilityExceptions,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from "../../hooks/use-availability";
import { reasonLabel } from "../../availability-model";
import { useExceptionConflicts } from "../../hooks/use-exception-conflicts";
import { AvailabilityConflictModal } from "./availability-conflict-modal";
import {
  AvailabilityExceptionForm,
  type ExceptionDraft,
} from "./availability-exception-form";

interface AvailabilityExceptionsProps {
  therapistProfileId: string;
  /** `manual_slots` cannot express extra availability as an interval. */
  manualMode?: boolean;
}

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * A whole-day absence in the therapist's own zone.
 *
 * `${date}T00:00:00Z` — the previous shape — is 02:00 in Belgrade, so the first
 * two hours of the day stayed bookable. Building the boundary from a local
 * `Date` lets the runtime apply the correct offset, DST included.
 */
function localDayBoundary(day: string, endOfDay: boolean): string {
  const [year, month, date] = day.split("-").map(Number);
  const local = endOfDay
    ? new Date(year ?? 0, (month ?? 1) - 1, date ?? 1, 23, 59, 59)
    : new Date(year ?? 0, (month ?? 1) - 1, date ?? 1, 0, 0, 0);
  return local.toISOString();
}

/**
 * Layer 3 — non-working days, annual leave and one-off absences.
 *
 * An exception never cancels a booked session: when one covers confirmed
 * appointments the therapist is asked to confirm and contact those clients
 * (handoff §7.5).
 */
export function AvailabilityExceptions({
  therapistProfileId,
  manualMode = false,
}: AvailabilityExceptionsProps) {
  const [from, setFrom] = useState(() => isoDay(0));
  const [until, setUntil] = useState(() => isoDay(180));
  const [pendingDraft, setPendingDraft] = useState<ExceptionDraft | null>(null);
  const [conflicts, setConflicts] = useState<Appointment[]>([]);

  const exceptions = useAvailabilityExceptions(therapistProfileId, from, until);
  const create = useCreateAvailabilityException();
  const remove = useDeleteAvailabilityException();
  const checkConflicts = useExceptionConflicts();

  const persist = (draft: ExceptionDraft) => {
    create.mutate({
      therapist_profile_id: therapistProfileId,
      kind: "unavailable",
      starts_at: localDayBoundary(draft.from, false),
      ends_at: localDayBoundary(draft.until, true),
      reason_code: draft.reasonCode,
      note: draft.note.trim() === "" ? null : draft.note.trim(),
      client_visible: draft.clientVisible,
    });
  };

  const submit = async (draft: ExceptionDraft) => {
    const booked = await checkConflicts.mutateAsync({
      therapistProfileId,
      startsAt: localDayBoundary(draft.from, false),
      endsAt: localDayBoundary(draft.until, true),
    });
    if (booked.length > 0) {
      setPendingDraft(draft);
      setConflicts(booked);
      return;
    }
    persist(draft);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <AvailabilityExceptionForm
        manualMode={manualMode}
        isSubmitting={create.isPending || checkConflicts.isPending}
        onSubmit={(draft) => void submit(draft)}
      />

      <AvailabilityConflictModal
        open={pendingDraft !== null}
        conflicts={conflicts}
        onCancel={() => setPendingDraft(null)}
        onConfirm={() => {
          if (pendingDraft) persist(pendingDraft);
          setPendingDraft(null);
        }}
      />

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
                  {item.note ? ` · ${item.note}` : ""}
                  {item.client_visible
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
