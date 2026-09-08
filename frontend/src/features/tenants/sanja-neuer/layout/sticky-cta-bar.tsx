"use client";

import { useRef } from "react";

import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { useBooking } from "@/features/tenants/sanja-neuer/booking/booking-context";
import { useStickyCta } from "@/features/tenants/sanja-neuer/hooks/use-sticky-cta";

const { stickyBar } = sanjaContent;

/**
 * The bar that rises once the hero is gone and retreats at the closing block.
 *
 * Always mounted and moved by transform, never conditionally rendered — an
 * element that is removed cannot animate away, it just disappears. The timing
 * is the design's: a slow start that settles quickly
 * (`cubic-bezier(.55,.03,.24,1)`), with opacity finishing sooner so the bar
 * fades in as it arrives rather than after.
 */
export function SanjaStickyCtaBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const { open, overlayOpen } = useBooking();
  useStickyCta(barRef, overlayOpen);

  return (
    <div
      ref={barRef}
      className="bg-sn-ink/95 pointer-events-none fixed inset-x-0 bottom-0 z-80 flex translate-y-[140%] items-center justify-between gap-4 px-5 pt-[22px] pb-3.5 opacity-0 backdrop-blur-[10px] will-change-transform [transition:transform_620ms_cubic-bezier(.55,.03,.24,1),opacity_380ms_ease-in-out] motion-reduce:transition-opacity"
    >
      <span
        aria-hidden
        className="bg-sn-lilac pointer-events-none absolute -top-[30px] right-5 block h-[30px] w-24 rounded-t-[14px]"
      />
      <span
        aria-hidden
        className="bg-sn-burgundy pointer-events-none absolute -top-5 right-5 block h-5 w-[150px] rounded-t-2xl"
      />
      <span
        aria-hidden
        className="bg-sn-lilac pointer-events-none absolute -top-2.5 right-5 block h-2.5 w-[212px] rounded-t-[18px]"
      />

      <span className="font-sn-display text-sn-ivory text-lg">
        {stickyBar.text}
      </span>

      <button
        type="button"
        onClick={open}
        className="bg-sn-ivory text-sn-burgundy shadow-sn-bar-ring shrink-0 cursor-pointer rounded-full px-[22px] py-3 text-xs tracking-[0.1em] whitespace-nowrap uppercase"
      >
        {stickyBar.cta}
      </button>
    </div>
  );
}
