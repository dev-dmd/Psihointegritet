"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/helpers/cn";

import {
  formatBookingCopy,
  formatBookingPrice,
  prefersReducedMotion,
} from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingWidgetCopy,
  BookingWidgetOffering,
  BookingWidgetTheme,
} from "../booking-widget.types";
import { BookingWidgetScrollButton } from "./BookingWidgetScrollButton";

interface BookingWidgetOfferingsProps {
  /** Authored case form; the heading only interpolates it, never inflects it. */
  therapistName: string;
  copy: BookingWidgetCopy;
  theme: BookingWidgetTheme;
  /** `false` hides the whole section — the locked selection renders read-only. */
  editable: boolean;
}

export function BookingWidgetOfferings({
  therapistName,
  copy,
  theme,
  editable,
}: BookingWidgetOfferingsProps) {
  const { availableOfferings, activeOffering, selectOffering } =
    useBookingWidget();
  const trackRef = useRef<HTMLDivElement>(null);

  /**
   * A half-visible card is the affordance that says „there is more" — so
   * tapping one must both select it and pull it fully into view. Without this
   * the person selects a card they can only partly read and has to scroll
   * manually to confirm what they picked.
   */
  const selectAndFocus = useCallback(
    (id: string, element: HTMLElement | null) => {
      selectOffering(id);
      element?.scrollIntoView?.({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    },
    [selectOffering],
  );

  // Arrows step by one card, so the affordance matches what the user sees.
  const step = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("[data-offering-card]");
    const width = card instanceof HTMLElement ? card.offsetWidth : 220;
    track.scrollBy?.({
      left: direction * (width + 8),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  if (!editable || availableOfferings.length === 0) return null;

  const heading = formatBookingCopy(copy.offeringsHeadingTemplate, {
    name: therapistName,
  });
  // A single offering is not a choice: no arrows, no swipe affordance (§6).
  const hasMultiple = availableOfferings.length > 1;

  return (
    <section aria-label={heading} className="mt-5">
      <div className="flex items-center justify-between gap-2">
        <h4
          className={cn(
            "text-[13px] font-semibold tracking-[0.08em] uppercase",
            theme.muted,
          )}
        >
          {heading}
        </h4>
        {hasMultiple ? (
          <div className="flex items-center gap-1">
            <BookingWidgetScrollButton
              direction="left"
              label={copy.previousOfferingLabel}
              theme={theme}
              onClick={() => step(-1)}
            />
            <BookingWidgetScrollButton
              direction="right"
              label={copy.nextOfferingLabel}
              theme={theme}
              onClick={() => step(1)}
            />
          </div>
        ) : null}
      </div>

      <div
        ref={trackRef}
        role="radiogroup"
        aria-label={heading}
        tabIndex={0}
        className={cn(
          "scrollbar-hide focus-visible:ring-meadow mt-3 flex gap-2 overflow-x-auto scroll-smooth rounded-2xl outline-none focus-visible:ring-2",
          hasMultiple ? "snap-x snap-mandatory" : null,
        )}
      >
        {availableOfferings.map((offering) => (
          <OfferingCard
            key={offering.id}
            offering={offering}
            copy={copy}
            theme={theme}
            isActive={offering.id === activeOffering?.id}
            // Partially visible next card is the second affordance (§6).
            grow={!hasMultiple}
            onSelect={(element) => selectAndFocus(offering.id, element)}
          />
        ))}
      </div>
    </section>
  );
}

interface OfferingCardProps {
  offering: BookingWidgetOffering;
  copy: BookingWidgetCopy;
  theme: BookingWidgetTheme;
  isActive: boolean;
  grow: boolean;
  onSelect: (element: HTMLElement | null) => void;
}

function OfferingCard({
  offering,
  copy,
  theme,
  isActive,
  grow,
  onSelect,
}: OfferingCardProps) {
  const formatLabel =
    offering.format === "online" ? copy.onlineLabel : copy.inPersonLabel;

  return (
    <button
      data-offering-card
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={(event) => onSelect(event.currentTarget)}
      className={cn(
        "focus-visible:ring-meadow min-h-[64px] shrink-0 cursor-pointer snap-start rounded-2xl border px-3.5 py-2.5 text-left transition-all outline-none focus-visible:ring-2",
        grow ? "w-full" : "w-[min(72%,208px)]",
        theme.border,
        isActive
          ? cn(theme.selectedSlot, "border-current/40")
          : cn(theme.muted, "hover:border-sage hover:text-current"),
      )}
    >
      <span className="block text-[13px] leading-tight font-medium">
        {offering.serviceName}
      </span>
      <span className="mt-1 block text-[12px] opacity-75">
        {offering.durationMinutes} min
        <span aria-hidden className="mx-1.5">
          ·
        </span>
        {formatLabel}
        <span aria-hidden className="mx-1.5">
          ·
        </span>
        {formatBookingPrice(offering.priceAmount, offering.currency)}
      </span>
      {/* Active state is never carried by colour alone (§12). */}
      {isActive ? <span className="sr-only">✓</span> : null}
    </button>
  );
}
