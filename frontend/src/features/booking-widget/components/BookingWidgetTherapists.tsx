"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";

import { cn } from "@/helpers/cn";

import { prefersReducedMotion } from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingTherapist,
  BookingWidgetCopy,
  BookingWidgetTheme,
} from "../booking-widget.types";
import { BookingWidgetScrollButton } from "./BookingWidgetScrollButton";

interface BookingWidgetTherapistsProps {
  therapists: BookingTherapist[];
  copy: BookingWidgetCopy;
  theme: BookingWidgetTheme;
  /** `false` hides the section entirely — a locked selection shows no peers. */
  editable: boolean;
}

/**
 * Vertical list, never a horizontal carousel (§7): a therapist card carries a
 * photo, a name and one professional line, which reads badly side by side.
 */
export function BookingWidgetTherapists({
  therapists,
  copy,
  theme,
  editable,
}: BookingWidgetTherapistsProps) {
  const { otherTherapistIds, selectTherapist } = useBookingWidget();
  const listRef = useRef<HTMLDivElement>(null);

  const step = useCallback((direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    const card = list.querySelector("[data-therapist-card]");
    const height = card instanceof HTMLElement ? card.offsetHeight : 56;
    list.scrollBy?.({
      top: direction * (height + 8),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  if (!editable) return null;

  const others = otherTherapistIds
    .map((id) => therapists.find((therapist) => therapist.id === id))
    .filter(
      (therapist): therapist is BookingTherapist => therapist !== undefined,
    );

  if (others.length === 0) return null;

  // Scroll controls only earn their place once the list actually overflows.
  const isScrollable = others.length > 2;

  return (
    <section aria-label={copy.otherTherapistsLabel} className="mt-5">
      <div className="flex items-center justify-between gap-2">
        <h4
          className={cn(
            "text-[13px] font-semibold tracking-[0.08em] uppercase",
            theme.muted,
          )}
        >
          {copy.otherTherapistsLabel}
        </h4>
        {isScrollable ? (
          <div className="flex items-center gap-1">
            <BookingWidgetScrollButton
              direction="up"
              label={copy.previousTherapistsLabel}
              theme={theme}
              onClick={() => step(-1)}
            />
            <BookingWidgetScrollButton
              direction="down"
              label={copy.nextTherapistsLabel}
              theme={theme}
              onClick={() => step(1)}
            />
          </div>
        ) : null}
      </div>

      <div
        ref={listRef}
        tabIndex={0}
        aria-label={copy.otherTherapistsLabel}
        className={cn(
          "scrollbar-hide focus-visible:ring-meadow mt-3 flex flex-col gap-2 overflow-y-auto scroll-smooth rounded-2xl outline-none focus-visible:ring-2",
          isScrollable ? "max-h-[152px]" : null,
        )}
      >
        {others.map((therapist) => (
          <button
            key={therapist.id}
            data-therapist-card
            type="button"
            onClick={() => selectTherapist(therapist.id)}
            className={cn(
              "focus-visible:ring-meadow flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all outline-none focus-visible:ring-2",
              theme.border,
              theme.muted,
              "hover:border-sage hover:text-current",
            )}
          >
            {therapist.avatarUrl ? (
              <Image
                src={therapist.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full border border-current/20 object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/25 font-serif text-[13px]"
              >
                {therapist.name.slice(0, 1)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">
                {therapist.name}
              </span>
              {therapist.title ? (
                <span className="mt-0.5 block truncate text-[11.5px] opacity-70">
                  {therapist.title}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
