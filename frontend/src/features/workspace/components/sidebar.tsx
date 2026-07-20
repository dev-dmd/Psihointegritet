"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/helpers/cn";

import { useWorkspace } from "../workspace-context";
import { visibleNav } from "../nav";
import { PowerIcon } from "./icons";

/** Number of open requests shown on the Termini badge (demo). */
const REQUEST_COUNT = 3;

function isActive(pathname: string, href: string): boolean {
  if (href === "/radni-prostor") {
    return pathname === "/radni-prostor";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Fixed forest sidebar (desktop ≥1024px), nav derived from the real roles. */
export function WorkspaceSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { isAdmin, isTherapist, roleLabel } = useWorkspace();
  const sections = visibleNav({ isAdmin, isTherapist });

  return (
    <aside className="bg-forest fixed top-0 bottom-0 left-0 z-50 hidden w-[264px] flex-col lg:flex">
      <div className="flex items-baseline px-6 pt-[26px] pb-[18px]">
        <span className="text-canvas font-serif text-[23px] font-medium tracking-[-0.01em]">
          Psihointegritet
        </span>
        <span
          aria-hidden
          className="bg-warm ml-1 inline-block h-1.5 w-1.5 rounded-full"
        />
      </div>
      <div className="text-meadow/75 px-6 pb-3.5 text-[10.5px] font-semibold tracking-[0.16em] uppercase">
        Control Center
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 pt-1 pb-4">
        {sections.map((section, index) => (
          <div key={section.caption ?? `section-${index}`}>
            {section.caption ? (
              <div className="text-canvas/38 mx-3 mt-[18px] mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
                {section.caption}
              </div>
            ) : null}
            {section.items.map((item) =>
              item.soon ? (
                <span
                  key={item.label}
                  className="text-canvas/45 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
                >
                  <item.icon />
                  {item.label}
                  <span className="text-warm ml-auto text-[9.5px] font-semibold tracking-[0.08em] uppercase">
                    Uskoro
                  </span>
                </span>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-[11px] text-sm font-semibold no-underline transition-colors duration-200",
                    isActive(pathname, item.href)
                      ? "bg-canvas/12 text-canvas"
                      : "text-canvas/62 hover:bg-canvas/8",
                  )}
                >
                  <item.icon />
                  {item.label}
                  {item.badge === "requests" ? (
                    <span className="bg-warm text-forest ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold">
                      {REQUEST_COUNT}
                    </span>
                  ) : null}
                </Link>
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="border-canvas/10 flex items-center gap-[11px] border-t px-[18px] pt-4 pb-5">
        <span className="border-meadow/55 bg-forest-lift text-canvas inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 text-[13px] font-semibold">
          {isAdmin ? "A" : "T"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-canvas truncate text-[13.5px] font-semibold">
            Član tima
          </div>
          <div className="text-canvas/50 text-[11.5px]">{roleLabel}</div>
        </div>
        <button
          type="button"
          title="Odjavi se"
          aria-label="Odjavi se"
          onClick={() => void signOut()}
          className="text-canvas/45 hover:bg-danger/25 hover:text-canvas flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent transition-colors"
        >
          <PowerIcon />
        </button>
      </div>
    </aside>
  );
}
