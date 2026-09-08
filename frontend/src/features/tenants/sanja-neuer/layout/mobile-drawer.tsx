"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { sanjaContent, sanjaNav } from "@/features/tenants/sanja-neuer/content";
import { SIGN_IN_PATH } from "@/lib/routes/auth-paths";
import { useScrollLock } from "@/features/tenants/sanja-neuer/hooks/use-scroll-lock";

const { wordmark, nav, footer } = sanjaContent;

/**
 * The navigation for anything under 900px.
 *
 * Closes on the ×, the scrim, any link and Escape — four ways out, because a
 * drawer that traps someone on a phone is the fastest way to lose them.
 *
 * Focus moves to the close button on open and the panel is a `dialog`, so a
 * keyboard user is inside the drawer rather than still tabbing the page behind
 * the scrim.
 */
export function SanjaMobileDrawer({
  open,
  onClose,
  onBook,
}: {
  open: boolean;
  onClose: () => void;
  onBook: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="bg-sn-ink/50 fixed inset-0 z-90 backdrop-blur-[4px] motion-safe:animate-[sn-fade_0.2s_ease_both]"
    >
      <nav
        role="dialog"
        aria-modal="true"
        aria-label={nav.menu}
        onClick={(event) => event.stopPropagation()}
        className="bg-sn-ivory shadow-sn-drawer absolute inset-y-0 right-0 flex w-3/4 max-w-[420px] flex-col overflow-y-auto px-[26px] pt-[22px] pb-[30px] motion-safe:animate-[sn-slide-in_0.28s_ease_both]"
      >
        <div className="mb-[34px] flex items-center justify-between gap-4">
          <span className="font-sn-display text-sn-ink text-[15px] tracking-[0.2em] uppercase">
            {wordmark}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={nav.closeMenu}
            className="border-sn-ink/22 text-sn-ink hover:bg-sn-ink hover:text-sn-ivory focus-visible:ring-sn-burgundy/40 size-11 shrink-0 cursor-pointer rounded-[14px] border text-lg transition-colors outline-none focus-visible:ring-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col">
          {sanjaNav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={onClose}
              className="font-sn-display border-sn-ink/10 text-sn-ink hover:text-sn-burgundy border-b py-4 text-[26px] leading-[1.3] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-[34px]">
          <button
            type="button"
            onClick={onBook}
            className="bg-sn-burgundy text-sn-ivory border-sn-burgundy hover:bg-sn-ink hover:border-sn-ink min-h-12 cursor-pointer rounded-full border px-6 py-[17px] text-xs tracking-[0.12em] uppercase transition-colors"
          >
            {footer.bookingCta}
          </button>
          <Link
            href={SIGN_IN_PATH}
            className="border-sn-ink/28 text-sn-ink hover:bg-sn-ink hover:text-sn-ivory flex min-h-12 items-center justify-center rounded-full border px-6 py-4 text-center text-xs tracking-[0.12em] uppercase transition-colors"
          >
            {nav.login}
          </Link>
          <p className="text-sn-ink/55 mt-2 text-center text-[13px] leading-[1.6]">
            {footer.availability}
          </p>
        </div>
      </nav>
    </div>
  );
}
