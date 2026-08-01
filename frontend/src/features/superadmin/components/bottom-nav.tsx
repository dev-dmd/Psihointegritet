"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/helpers/cn";

import { ActivityIcon, BuildingIcon, GatesIcon, GridIcon } from "./icons";

interface BottomNavItem {
  href: Route;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}

/** Mobile order per the prototype — Gates last, shortened label. */
const items: BottomNavItem[] = [
  { href: "/superadmin", label: "Pregled", icon: GridIcon },
  { href: "/superadmin/tenants", label: "Tenanti", icon: BuildingIcon },
  {
    href: "/superadmin/diagnostics",
    label: "Dijagnostika",
    icon: ActivityIcon,
  },
  { href: "/superadmin/features", label: "Gates", icon: GatesIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/superadmin") {
    return pathname === "/superadmin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Mobile bottom navigation (<1024px), 4 tiles with warm active pill. */
export function SuperadminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="border-coffee/8 bg-surface fixed right-0 bottom-0 left-0 z-[70] grid grid-cols-4 border-t px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-12 flex-col items-center justify-end gap-[3px] py-1 no-underline"
          >
            <span
              className={cn(
                "flex h-[26px] w-[42px] items-center justify-center rounded-full",
                active ? "bg-warm/50 text-coffee" : "text-coffee/50",
              )}
            >
              <item.icon size={19} />
            </span>
            <span
              className={cn(
                "text-[10.5px] font-semibold",
                active ? "text-coffee" : "text-coffee/50",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
