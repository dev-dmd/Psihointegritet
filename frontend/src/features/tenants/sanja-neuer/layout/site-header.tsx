"use client";

import Link from "next/link";

import { cn } from "@/helpers/cn";
import { SIGN_IN_PATH } from "@/lib/routes/auth-paths";
import { sanjaContent, sanjaNav } from "@/features/tenants/sanja-neuer/content";
import { useBooking } from "@/features/tenants/sanja-neuer/booking/booking-context";
import { useScrollSpy } from "@/features/tenants/sanja-neuer/hooks/use-scroll-spy";
import { SanjaMobileDrawer } from "@/features/tenants/sanja-neuer/layout/mobile-drawer";

const { wordmark, nav } = sanjaContent;
const NAV_IDS = sanjaNav.map((item) => item.id);

/**
 * Sticky header, and the only place the drawer is mounted.
 *
 * Below 900px the nav and the Login pill drop out and the burger appears —
 * a single breakpoint, matching the design's one narrow family. The `Zakaži`
 * button survives at every width, because it is the page's whole purpose.
 */
export function SanjaSiteHeader() {
  const { open: openBooking, drawerOpen, setDrawerOpen } = useBooking();
  const activeId = useScrollSpy(NAV_IDS);

  return (
    <>
      <header className="bg-sn-ivory/90 sticky top-0 z-70 backdrop-blur-[14px]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-7 px-6 py-4">
          <a
            href="#top"
            className="font-sn-display text-sn-ink text-[19px] tracking-[0.3em] whitespace-nowrap uppercase max-[620px]:text-[15px] max-[620px]:tracking-[0.2em]"
          >
            {wordmark}
          </a>

          <nav className="ml-auto hidden items-center gap-[26px] min-[901px]:flex">
            {sanjaNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={activeId === item.id ? "true" : undefined}
                className={cn(
                  "border-b pb-[3px] text-xs tracking-[0.14em] uppercase transition-colors",
                  activeId === item.id
                    ? "border-sn-ink text-sn-ink"
                    : "text-sn-ink/62 hover:text-sn-ink border-transparent",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href={SIGN_IN_PATH}
              className="border-sn-ink/28 text-sn-ink hover:bg-sn-ink hover:text-sn-ivory hidden rounded-full border px-[18px] py-2.5 text-xs tracking-[0.12em] uppercase transition-colors min-[901px]:inline-flex"
            >
              {nav.login}
            </Link>

            <button
              type="button"
              onClick={openBooking}
              className="bg-sn-burgundy text-sn-ivory border-sn-burgundy hover:bg-sn-ink hover:border-sn-ink cursor-pointer rounded-full border px-[22px] py-[11px] text-xs tracking-[0.12em] uppercase transition-colors max-[620px]:px-4 max-[620px]:py-2.5 max-[620px]:text-[11px]"
            >
              {nav.book}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={nav.menu}
              aria-expanded={drawerOpen}
              className="border-sn-ink/22 hover:border-sn-burgundy flex size-[46px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[14px] border transition-colors min-[901px]:hidden"
            >
              <span
                aria-hidden
                className="bg-sn-ink block h-[1.5px] w-[18px]"
              />
              <span
                aria-hidden
                className="bg-sn-ink block h-[1.5px] w-[18px]"
              />
              {/* The short third bar is burgundy — the one brand mark in the
                  header at narrow widths, where the wordmark has shrunk. */}
              <span
                aria-hidden
                className="bg-sn-burgundy mr-3.5 block h-[1.5px] w-3 self-end"
              />
            </button>
          </div>
        </div>
      </header>

      <SanjaMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onBook={() => {
          setDrawerOpen(false);
          openBooking();
        }}
      />
    </>
  );
}
