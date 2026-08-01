"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/helpers/cn";

import { bottomNavItems } from "../nav";
import { MoreIcon, PlusIcon } from "./icons";

function isActive(pathname: string, href: string): boolean {
  if (href === "/radni-prostor") {
    return pathname === "/radni-prostor";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile bottom navigation (<1024px): Pregled · Termini · [+] · Klijenti ·
 * Više. The center FAB and „Više" are stubs for now (Booking engine / role
 * sheet arrive later). Only the always-visible items appear here — admin-only
 * screens stay in the desktop sidebar for this phase.
 */
export function WorkspaceBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-coffee/8 bg-surface fixed right-0 bottom-0 left-0 z-[70] grid grid-cols-5 items-end border-t px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
      {bottomNavItems.map((item, index) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            // Pregled, Termini occupy cols 1–2; Klijenti jumps to col 4 (FAB
            // sits in col 3). gridRowStart is pinned on every item — without
            // it, CSS Grid auto-placement wraps the FAB (col 3, placed after
            // Klijenti's col 4 in DOM order) onto a second row, since its
            // column is smaller than the auto-placement cursor's position.
            style={{
              gridColumnStart: index < 2 ? index + 1 : 4,
              gridRowStart: 1,
            }}
            className="flex min-h-12 flex-col items-center justify-end gap-[3px] py-1 no-underline"
          >
            <span
              className={cn(
                "flex h-[26px] w-[42px] items-center justify-center rounded-full",
                active ? "bg-meadow/50 text-forest" : "text-coffee/50",
              )}
            >
              <item.icon size={19} />
            </span>
            <span
              className={cn(
                "text-[10.5px] font-semibold",
                active ? "text-forest" : "text-coffee/50",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        aria-label="Brza akcija"
        onClick={() => toast("Brza akcija stiže sa Booking engine-om.")}
        style={{ gridColumnStart: 3, gridRowStart: 1 }}
        className="bg-forest text-canvas shadow-help mx-auto flex h-12 w-12 -translate-y-1 cursor-pointer items-center justify-center rounded-full border-0"
      >
        <PlusIcon size={18} />
      </button>
      <button
        type="button"
        aria-label="Više"
        onClick={() => toast("Još opcija stiže uskoro.")}
        style={{ gridColumnStart: 5, gridRowStart: 1 }}
        className="flex min-h-12 cursor-pointer flex-col items-center justify-end gap-[3px] border-0 bg-transparent py-1"
      >
        <span className="text-coffee/50 flex h-[26px] w-[42px] items-center justify-center rounded-full">
          <MoreIcon size={19} />
        </span>
        <span className="text-coffee/50 text-[10.5px] font-semibold">Više</span>
      </button>
    </nav>
  );
}
