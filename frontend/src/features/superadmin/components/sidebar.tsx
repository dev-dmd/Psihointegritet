"use client";

import { useClerk } from "@clerk/nextjs";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/helpers/cn";

import {
  ActivityIcon,
  BuildingIcon,
  CardIcon,
  FileIcon,
  GatesIcon,
  GridIcon,
  PowerIcon,
  ShieldIcon,
  SlidersIcon,
} from "./icons";

interface NavItem {
  href: Route;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  /** Mono count badge (Tenanti). */
  badge?: string;
}

const mainNav: NavItem[] = [
  { href: "/superadmin", label: "Pregled", icon: GridIcon },
  {
    href: "/superadmin/tenants",
    label: "Tenanti",
    icon: BuildingIcon,
    badge: "1",
  },
  { href: "/superadmin/features", label: "Feature Gates", icon: GatesIcon },
  {
    href: "/superadmin/diagnostics",
    label: "Dijagnostika",
    icon: ActivityIcon,
  },
];

const soonNav: NavItem[] = [
  { href: "/superadmin/billing", label: "Pretplate", icon: CardIcon },
];

const systemNav: NavItem[] = [
  { href: "/superadmin/audit-log", label: "Audit Log", icon: FileIcon },
  { href: "/superadmin/settings", label: "Podešavanja", icon: SlidersIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/superadmin") {
    return pathname === "/superadmin";
  }
  // Tenant profile highlights „Tenanti".
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Fixed coffee sidebar (desktop ≥1024px) — 1:1 with the prototype. */
export function SuperadminSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="bg-coffee fixed top-0 bottom-0 left-0 z-50 hidden w-[264px] flex-col lg:flex">
      <div className="flex items-baseline px-6 pt-[26px] pb-1.5">
        <span className="text-panel-canvas font-serif text-[23px] font-medium">
          Psihointegritet
        </span>
        <span
          aria-hidden
          className="bg-warm ml-1 inline-block h-1.5 w-1.5 rounded-full"
        />
      </div>
      <div className="px-6 pb-[18px]">
        <span className="bg-warm text-coffee inline-flex items-center gap-[7px] rounded-full px-[11px] py-[5px] text-[10px] font-bold tracking-[0.18em] uppercase">
          <ShieldIcon />
          Superadmin
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 pt-1 pb-4">
        {mainNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-[11px] text-sm font-semibold no-underline transition-colors duration-200",
                active
                  ? "bg-warm/18 text-panel-canvas"
                  : "text-panel-canvas/62 hover:bg-panel-canvas/8",
              )}
            >
              <item.icon />
              {item.label}
              {item.badge ? (
                <span className="bg-panel-canvas/14 text-panel-canvas ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-bold">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        {soonNav.map((item) => (
          <SoonNavLink key={item.href} item={item} />
        ))}
        <div className="text-panel-canvas/35 mx-3 mt-[18px] mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
          Sistem
        </div>
        {systemNav.map((item) => (
          <SoonNavLink key={item.href} item={item} />
        ))}
      </nav>
      <div className="border-panel-canvas/10 flex items-center gap-[11px] border-t px-[18px] pt-4 pb-5">
        <span className="bg-warm/25 border-warm/50 text-panel-canvas inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 text-[12.5px] font-bold tracking-[0.05em]">
          SA
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-panel-canvas text-[13.5px] font-semibold">
            Platform tim
          </div>
          <div className="text-panel-canvas/45 font-mono text-[10.5px]">
            produkcija · eu-central
          </div>
        </div>
        <button
          type="button"
          title="Odjavi se"
          aria-label="Odjavi se"
          onClick={() => void signOut()}
          className="text-panel-canvas/45 hover:bg-danger/25 hover:text-panel-canvas flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent transition-colors"
        >
          <PowerIcon />
        </button>
      </div>
    </aside>
  );
}

/** Muted nav link with the amber „Uskoro" tag (planned modules). */
function SoonNavLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="text-panel-canvas/42 hover:bg-panel-canvas/6 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors duration-200"
    >
      <item.icon />
      {item.label}
      <span className="text-warm ml-auto text-[9.5px] font-semibold tracking-[0.08em] uppercase">
        Uskoro
      </span>
    </Link>
  );
}
