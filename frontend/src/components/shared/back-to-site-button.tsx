import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/helpers/cn";

/**
 * Link back to the marketing site, always in a new tab — the panels are a
 * separate app surface, not something to navigate away from in place. Not
 * part of the original design handoff (no such control exists there); one
 * element that morphs with the breakpoint instead of two swapped nodes: a
 * round icon-only circle on mobile, an icon+label pill from `lg:` up. Callers
 * supply only the surrounding topbar's existing button theme via `className`.
 */
export function BackToSiteButton({ className }: { className?: string }) {
  return (
    <Link
      href={"/" as Route}
      target="_blank"
      rel="noopener noreferrer"
      title="Glavni sajt"
      aria-label="Glavni sajt"
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border text-[13px] font-semibold no-underline transition-colors lg:w-auto lg:px-3.5",
        className,
      )}
    >
      <svg
        aria-hidden
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a13 13 0 0 1 0 18 13 13 0 0 1 0-18" />
      </svg>
      <span className="hidden lg:inline">Glavni sajt</span>
    </Link>
  );
}
