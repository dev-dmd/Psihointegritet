"use client";

import {
  BellIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useMemo, useState } from "react";

import { cn } from "@/helpers/cn";

import { isPastDate, toLocalDate } from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingSlot,
  BookingTherapist,
  BookingWidgetCopy,
  BookingWidgetTheme,
} from "../booking-widget.types";

interface BookingWidgetActionsProps {
  copy: BookingWidgetCopy;
  therapist?: BookingTherapist;
  slots: BookingSlot[];
  showNotifyAction: boolean;
  onCancel?: () => void;
  onNotify?: () => void;
  onSubmit?: (payload: {
    serviceId: string;
    therapistId?: string;
    format: "online" | "uzivo";
    slotId?: string;
    selectedDate?: string;
  }) => void;
  theme: BookingWidgetTheme;
}

function formatNotifyDate(date: string): string {
  return new Intl.DateTimeFormat("sr-Latn-RS", {
    day: "numeric",
    month: "long",
  }).format(toLocalDate(date));
}

export function BookingWidgetActions({
  copy,
  therapist,
  slots,
  showNotifyAction,
  onCancel,
  onNotify,
  onSubmit,
  theme,
}: BookingWidgetActionsProps) {
  const {
    buildSubmitPayload,
    notifyOpen,
    resetSelection,
    selectedSlotId,
    setNotifyOpen,
  } = useBookingWidget();
  const notifyCandidates = useMemo(
    () =>
      slots
        .filter((slot) => !slot.available && !isPastDate(slot.date))
        .sort((left, right) =>
          `${left.date}${left.startTime}`.localeCompare(
            `${right.date}${right.startTime}`,
          ),
        ),
    [slots],
  );
  const [notifyTargetId, setNotifyTargetId] = useState<string | null>(
    notifyCandidates[0]?.id ?? null,
  );

  const cancel = () => {
    resetSelection();
    onCancel?.();
  };

  const confirmNotify = () => {
    if (!notifyTargetId) return;
    onNotify?.();
    setNotifyOpen(false);
  };

  return (
    <>
      <footer
        className={cn(
          "mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between",
          theme.border,
        )}
      >
        <button
          type="button"
          onClick={cancel}
          className={cn(
            "focus-visible:ring-meadow min-h-10 cursor-pointer rounded-lg border px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2",
            theme.secondaryButton,
          )}
        >
          {copy.cancelLabel}
        </button>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center">
          {showNotifyAction ? (
            <button
              type="button"
              onClick={() => setNotifyOpen(true)}
              className={cn(
                "focus-visible:ring-meadow inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2",
                theme.secondaryButton,
              )}
            >
              <BellIcon className="size-4" />
              {copy.notifyLabel}
            </button>
          ) : null}
          <button
            type="button"
            disabled={!selectedSlotId}
            onClick={() => onSubmit?.(buildSubmitPayload(therapist?.id))}
            className={cn(
              "focus-visible:ring-meadow inline-flex min-h-10 cursor-pointer items-center justify-center gap-3 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
              theme.primaryButton,
            )}
          >
            {copy.bookLabel}
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </footer>

      <Dialog
        open={notifyOpen}
        onClose={setNotifyOpen}
        className="relative z-[90]"
      >
        <DialogBackdrop className="bg-coffee/50 fixed inset-0" />
        <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
          <DialogPanel
            className={cn(
              "shadow-panel-modal w-full max-w-lg rounded-[24px] border p-5 sm:p-7",
              theme.panel,
              theme.contentPanel,
              theme.border,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={cn(
                    "text-warm text-xs font-semibold tracking-[0.14em] uppercase",
                  )}
                >
                  Raniji termin
                </p>
                <DialogTitle
                  className={cn(
                    "mt-2 font-serif text-2xl font-normal",
                    theme.heading,
                  )}
                >
                  Obavestite me kada se termin oslobodi
                </DialogTitle>
              </div>
              <button
                type="button"
                aria-label="Zatvori"
                onClick={() => setNotifyOpen(false)}
                className={cn(
                  "focus-visible:ring-meadow inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2",
                  theme.muted,
                )}
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <p className={cn("mt-3 text-sm leading-[1.55]", theme.muted)}>
              Izaberite popunjen budući termin. Ako se oslobodi, dobićete
              privatnu ponudu; kasniji zakazani termin možete zadržati.
            </p>

            {notifyCandidates.length > 0 ? (
              <div className="mt-5 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {notifyCandidates.map((slot) => {
                  const isSelected = notifyTargetId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setNotifyTargetId(slot.id)}
                      className={cn(
                        "focus-visible:ring-meadow cursor-pointer rounded-xl border px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2",
                        isSelected ? theme.selectedSlot : theme.slot,
                      )}
                    >
                      <span className="block font-semibold">
                        {formatNotifyDate(slot.date)}
                      </span>
                      <span className="mt-0.5 block text-xs opacity-75">
                        {slot.startTime}–{slot.endTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p
                className={cn(
                  "mt-5 rounded-xl border px-4 py-3 text-sm",
                  theme.border,
                  theme.muted,
                )}
              >
                Trenutno nema popunjenih budućih termina za izbor.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setNotifyOpen(false)}
                className={cn(
                  "focus-visible:ring-meadow cursor-pointer rounded-full border px-5 py-2.5 text-sm font-medium outline-none focus-visible:ring-2",
                  theme.secondaryButton,
                )}
              >
                Nazad
              </button>
              <button
                type="button"
                disabled={!notifyTargetId}
                onClick={confirmNotify}
                className={cn(
                  "focus-visible:ring-meadow cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45",
                  theme.primaryButton,
                )}
              >
                Sačuvaj obaveštenje
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
