"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/helpers/cn";
import { MobileDrawerCloseContext } from "@/components/sections/mobile-menu-context";
import type { NavLink } from "@/content/homepage";
import { useGuidance } from "@/features/guidance/guidance-context";

interface MobileMenuProps {
  links: NavLink[];
  /** glass — burger over the hero header; solid — inside the sticky pill. */
  variant?: "glass" | "solid";
  /**
   * Optional auth control rendered in the drawer footer. A plain node (a client
   * element created in the Server Component header) — rendered as-is, never
   * cloned. It closes the drawer on tap via `MobileDrawerCloseContext`, so no
   * prop injection crosses the server/client boundary.
   */
  authSlot?: ReactNode;
}

/** Burger trigger + slide-in navigation drawer, visible below the lg breakpoint. */
export function MobileMenu({
  links,
  variant = "glass",
  authSlot,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const { openChooser } = useGuidance();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Otvori meni"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-full lg:hidden",
          variant === "glass"
            ? "text-forest h-11 w-11 border border-white/35 bg-gray-400/32 backdrop-blur-[14px]"
            : "bg-forest text-canvas h-[38px] w-[38px] border-0",
        )}
      >
        <svg
          aria-hidden
          width={variant === "glass" ? 20 : 18}
          height={variant === "glass" ? 20 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/*
        Portal to <body>: the sticky pill ancestor has transform + backdrop-filter,
        which would otherwise turn position:fixed into pill-relative positioning.
      */}
      {open
        ? createPortal(
            <>
              <div
                aria-hidden
                onClick={() => setOpen(false)}
                className="bg-coffee/50 animate-fade-in fixed inset-0 z-[88]"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Meni"
                className="bg-canvas shadow-drawer animate-drawer-in fixed top-0 right-0 bottom-0 z-[89] flex w-[min(340px,88vw)] flex-col"
              >
                <div className="border-coffee/10 flex items-center justify-between border-b px-6 py-[22px]">
                  <span className="text-forest font-serif text-[21px] font-medium">
                    Psihointegritet
                  </span>
                  <button
                    type="button"
                    aria-label="Zatvori meni"
                    onClick={() => setOpen(false)}
                    className="border-coffee/15 text-coffee flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border bg-transparent text-[15px]"
                  >
                    ✕
                  </button>
                </div>
                <nav
                  aria-label="Mobilna navigacija"
                  className="flex flex-1 flex-col overflow-y-auto px-2 py-4"
                >
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href as Route}
                      onClick={() => setOpen(false)}
                      className="text-coffee hover:bg-meadow/25 rounded-xl px-4 py-3.5 text-[17px] font-medium no-underline"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="border-coffee/10 border-t px-6 pt-5 pb-7">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openChooser();
                    }}
                    className="bg-forest text-canvas flex cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 px-6 py-[15px] text-[15px] font-semibold"
                  >
                    Zakaži termin
                  </button>
                  {authSlot ? (
                    <MobileDrawerCloseContext.Provider
                      value={() => setOpen(false)}
                    >
                      {authSlot}
                    </MobileDrawerCloseContext.Provider>
                  ) : null}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
