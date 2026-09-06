"use client";

import { cn } from "@/helpers/cn";

import type { BookingWidgetTheme } from "../booking-widget.types";

const rotationByDirection = {
  left: "rotate-180",
  right: "",
  up: "-rotate-90",
  down: "rotate-90",
} as const;

interface BookingWidgetScrollButtonProps {
  direction: keyof typeof rotationByDirection;
  /** Always spoken: the glyph alone must not carry the meaning (§12). */
  label: string;
  theme: BookingWidgetTheme;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Shared arrow control for the offering carousel and the therapist list, so
 * both reuse the calendar's visual language instead of inventing a second one.
 */
export function BookingWidgetScrollButton({
  direction,
  label,
  theme,
  onClick,
  disabled = false,
}: BookingWidgetScrollButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        // 32px keeps the touch target usable without breaking the compact row.
        "focus-visible:ring-meadow inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all outline-none focus-visible:ring-2 disabled:cursor-default disabled:opacity-35",
        theme.border,
        theme.muted,
        "hover:border-sage hover:text-current",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className={cn("h-3.5 w-3.5", rotationByDirection[direction])}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5.5 2.5 11 8l-5.5 5.5" />
      </svg>
    </button>
  );
}
