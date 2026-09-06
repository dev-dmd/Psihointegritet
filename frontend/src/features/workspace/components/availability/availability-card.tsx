"use client";

import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

interface AvailabilityCardProps {
  index: number;
  title: string;
  children: ReactNode;
  /** Omitted on card 2, which is derived and therefore has no action. */
  editHref?: Route;
  editLabel?: string;
  /** Shown instead of the button — card 2's „Nastaje iz radnog vremena". */
  footerNote?: string;
  /** Right-hand chip in the header, e.g. „Planirano za R4" on card 4. */
  badge?: ReactNode;
}

/**
 * Shared frame for the four availability layers (design handoff §3).
 *
 * The numbered eyebrow stays in the UI on purpose: it teaches the model that
 * availability is four separate layers the Booking engine reads apart, and
 * that availability is not an appointment.
 *
 * Cards in one row match height — content grows, the footer is pinned with
 * `mt-auto` — so the row does not look ragged when one layer is empty.
 */
export function AvailabilityCard({
  index,
  title,
  children,
  editHref,
  editLabel = "Uredi",
  footerNote,
  badge,
}: AvailabilityCardProps) {
  return (
    <div className="rounded-card border-line bg-surface flex h-full flex-col border px-6 py-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-sage text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          {index} · {title}
        </span>
        {badge}
      </div>

      <div className="min-w-0">{children}</div>

      <div
        className={cn(
          "border-line mt-[14px] flex justify-end border-t pt-[13px]",
          // Same row height whether the card ends in a button or a note, so
          // neighbouring cards align.
          "min-h-[57px] items-center",
        )}
      >
        {editHref ? (
          <Link
            href={editHref}
            className="border-line-strong text-forest hover:border-coffee/40 inline-flex min-h-11 w-full items-center justify-center rounded-full border bg-transparent px-4 text-[13px] font-semibold no-underline transition-colors sm:w-auto"
          >
            {editLabel}
          </Link>
        ) : footerNote ? (
          <span className="text-ink-45 text-[13px] italic">{footerNote}</span>
        ) : null}
      </div>
    </div>
  );
}
