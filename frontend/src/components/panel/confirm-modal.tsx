"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useState } from "react";

interface ConfirmModalProps {
  open: boolean;
  /** Eyebrow above the title, e.g. „Potvrda promene". */
  eyebrow: string;
  title: string;
  /** Context line, e.g. „Tenant Psihointegritet · Uključeno → Isključeno". */
  description: string;
  /** Mandatory-reason label; the confirm button stays disabled without text. */
  reasonLabel: string;
  reasonPlaceholder: string;
  /** Amber note under the reason (audit-log warning). */
  note: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/**
 * Superadmin confirmation modal (handoff component #19): every gate change
 * demands a reason — who/when/old→new/reason go to the activity feed (and to
 * the real Audit Log once the backend lands).
 */
export function ConfirmModal({
  open,
  eyebrow,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  note,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} className="relative z-[90]">
      <DialogBackdrop className="bg-coffee/50 animate-fade-in fixed inset-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="rounded-modal shadow-panel-modal bg-panel-canvas w-[min(440px,100%)] px-7 py-8">
          <div className="text-sage mb-2 text-[12px] font-semibold tracking-[0.16em] uppercase">
            {eyebrow}
          </div>
          <DialogTitle className="text-coffee font-serif text-[22px] leading-[1.2]">
            {title}
          </DialogTitle>
          <p className="text-ink-70 mt-2 text-sm leading-[1.5]">
            {description}
          </p>

          <label
            htmlFor="confirm-modal-reason"
            className="text-ink-70 mt-5 mb-1.5 block text-[13px] font-semibold"
          >
            {reasonLabel}
          </label>
          <input
            id="confirm-modal-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={reasonPlaceholder}
            className="border-line-strong rounded-tile bg-surface text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none"
          />

          <p className="bg-badge-amber-bg text-badge-amber rounded-tile mt-4 px-4 py-3 text-[12.5px] leading-[1.5]">
            {note}
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={!reason.trim()}
              onClick={() => {
                onConfirm(reason.trim());
                setReason("");
              }}
              className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
