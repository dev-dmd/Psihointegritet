"use client";

import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";
import { useBooking } from "@/features/tenants/sanja-neuer/booking/booking-context";

/**
 * The only interactive thing most sections contain.
 *
 * Sections stay server components and drop one of these in; the client boundary
 * is a single button rather than a whole section. `variant` carries the design's
 * odd/even rhythm — burgundy is always primary, lilac outlines belong to odd
 * sections and ivory fills to burgundy grounds.
 */
export type BookButtonVariant =
  | "primary" /* burgundy fill → ink on hover */
  | "lilac" /* lilac outline, for odd sections */
  | "ivory" /* ivory fill on a burgundy ground → lilac on hover */
  | "ink" /* ink outline → ink fill */
  | "ivory-outline" /* on the ink footer */
  | "text"; /* underlined text link */

const VARIANTS: Record<BookButtonVariant, string> = {
  primary:
    "bg-sn-burgundy text-sn-ivory border border-sn-burgundy shadow-sn-cta hover:bg-sn-ink hover:border-sn-ink",
  lilac:
    "bg-transparent text-sn-ink border border-sn-lilac hover:bg-sn-lilac/30",
  ivory:
    "bg-sn-ivory text-sn-burgundy border border-sn-ivory hover:bg-sn-lilac hover:border-sn-lilac hover:text-sn-ink",
  ink: "bg-transparent text-sn-ink border border-sn-ink hover:bg-sn-ink hover:text-sn-ivory",
  "ivory-outline":
    "bg-transparent text-sn-ivory border border-sn-ivory/40 hover:bg-sn-ivory hover:text-sn-ink",
  text: "border-b border-sn-ink pb-1 text-sn-ink hover:text-sn-burgundy hover:border-sn-burgundy",
};

export function BookButton({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: BookButtonVariant;
  className?: string;
}) {
  const { open } = useBooking();
  const isText = variant === "text";

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "cursor-pointer transition-colors",
        "focus-visible:ring-sn-burgundy/40 outline-none focus-visible:ring-2",
        isText
          ? "text-sm tracking-[0.06em]"
          : "rounded-full text-[13px] tracking-[0.1em] uppercase",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
