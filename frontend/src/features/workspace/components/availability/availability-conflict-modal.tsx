"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import { formatDateSr } from "@/helpers/format-date";
import type { Appointment } from "@/lib/api/booking";

interface AvailabilityConflictModalProps {
  open: boolean;
  conflicts: Appointment[];
  onCancel: () => void;
  onConfirm: () => void;
}

const MAX_LISTED = 6;

/**
 * Warns that an exception covers confirmed appointments (handoff §7.5).
 *
 * Deliberately **not** `ConfirmModal`: that component demands a mandatory
 * written reason because it feeds the audit log for feature-gate changes.
 * Forcing a therapist to justify their own day off would be a meaningless
 * field, so this dialog reuses the same Headless UI primitives and asks only
 * for the decision.
 *
 * The exception never cancels anything — the point is that the therapist finds
 * out in time to contact those clients.
 */
export function AvailabilityConflictModal({
  open,
  conflicts,
  onCancel,
  onConfirm,
}: AvailabilityConflictModalProps) {
  const hidden = Math.max(0, conflicts.length - MAX_LISTED);

  return (
    <Dialog open={open} onClose={onCancel} className="relative z-[90]">
      <DialogBackdrop className="bg-coffee/50 fixed inset-0" />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel className="rounded-modal shadow-panel-modal bg-panel-canvas border-line w-[min(480px,100%)] border p-5 sm:p-7">
          <p className="text-badge-wait text-[11.5px] font-semibold tracking-[0.14em] uppercase">
            Provera pre upisa
          </p>
          <DialogTitle className="text-coffee mt-2 font-serif text-2xl font-normal">
            U ovom periodu imate {conflicts.length} potvrđen
            {conflicts.length === 1 ? " termin" : "ih termina"}
          </DialogTitle>

          <p className="text-ink-55 mt-3 text-[13.5px] leading-[1.55]">
            Izuzetak ih <strong className="text-coffee">ne otkazuje</strong> —
            kontaktirajte klijente.
          </p>

          <ul className="border-line mt-4 flex flex-col gap-1.5 rounded-lg border px-3 py-2.5">
            {conflicts.slice(0, MAX_LISTED).map((item) => (
              <li key={item.id} className="text-coffee text-[13px]">
                {formatDateSr(item.start_time.slice(0, 10))} ·{" "}
                {item.start_time.slice(11, 16)}
              </li>
            ))}
            {hidden > 0 ? (
              <li className="text-ink-45 text-[13px]">+ još {hidden}</li>
            ) : null}
          </ul>

          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="border-line-strong text-forest hover:border-coffee/40 min-h-11 cursor-pointer rounded-full border bg-transparent px-4 text-[13px] font-semibold transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full px-5 text-[13px] font-semibold transition-colors"
            >
              Ipak upiši izuzetak
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
