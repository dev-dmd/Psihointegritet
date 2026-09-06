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
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";

import { isPastDate, toLocalDate } from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingSlot,
  BookingWidgetCopy,
  BookingWidgetTheme,
} from "../booking-widget.types";

interface BookingWidgetActionsProps {
  copy: BookingWidgetCopy;
  slots: BookingSlot[];
  showNotifyAction: boolean;
  /** Present only when the selection is locked (e.g. the Intake hand-off). */
  onBack?: (() => void) | undefined;
  backLabel?: string | undefined;
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

export function BookingWidgetActions({
  copy,
  slots,
  showNotifyAction,
  onBack,
  backLabel,
  onCancel,
  onNotify,
  onSubmit,
  theme,
}: BookingWidgetActionsProps) {
  const t = useTranslations("public.bookingWidget");
  const format = useFormatter();
  const {
    buildSubmitPayload,
    notifyOpen,
    resetSelection,
    selectedSlotId,
    selectedTherapistId,
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
        {/*
          „Nazad" and „Otkaži" share one row on every width and one styling.
          On mobile „Nazad" keeps its content width while „Otkaži" takes all
          remaining space up to the right edge, so the pair never reads as two
          interchangeable grey buttons. On desktop the footer row is already
          content-sized, so both fall back to their natural widths.
        */}
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel ?? copy.backAriaLabel}
              className={cn(
                "focus-visible:ring-meadow min-h-10 w-auto shrink-0 cursor-pointer rounded-lg border px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2",
                theme.secondaryButton,
              )}
            >
              {copy.backLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={cancel}
            className={cn(
              "focus-visible:ring-meadow min-h-10 grow cursor-pointer rounded-lg border px-5 py-2.5 text-sm font-medium transition-all duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2 sm:w-auto sm:grow-0",
              theme.secondaryButton,
            )}
          >
            {copy.cancelLabel}
          </button>
        </div>
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
            onClick={() =>
              onSubmit?.(buildSubmitPayload(selectedTherapistId ?? undefined))
            }
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
                  {t("notifyEyebrow")}
                </p>
                <DialogTitle
                  className={cn(
                    "mt-2 font-serif text-2xl font-normal",
                    theme.heading,
                  )}
                >
                  {t("notifyTitle")}
                </DialogTitle>
              </div>
              <button
                type="button"
                aria-label={t("close")}
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
              {t("notifyBody")}
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
                        {format.dateTime(toLocalDate(slot.date), {
                          day: "numeric",
                          month: "long",
                        })}
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
                {t("noNotifySlots")}
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
                {t("back")}
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
                {t("saveNotification")}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
