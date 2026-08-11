"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/helpers/cn";
import { localizedPath } from "@/lib/routes/localized-path";
import { isRouteActive } from "@/lib/routes/match";
import type { PlatformRouteId } from "@/lib/routes/platform-routes";
import { useUiLocale } from "@/i18n/use-ui-locale";

import { ActivityIcon, BuildingIcon, GatesIcon, GridIcon } from "./icons";

interface BottomNavItem {
  routeId: PlatformRouteId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}

/** Mobile order per the prototype — Gates last, shortened label. */
const items: BottomNavItem[] = [
  { routeId: "superadmin.home", label: "Pregled", icon: GridIcon },
  { routeId: "superadmin.tenants.list", label: "Tenanti", icon: BuildingIcon },
  {
    routeId: "superadmin.diagnostics",
    label: "Dijagnostika",
    icon: ActivityIcon,
  },
  { routeId: "superadmin.features", label: "Gates", icon: GatesIcon },
];

/** Mobile bottom navigation (<1024px), 4 tiles with warm active pill. */
export function SuperadminBottomNav() {
  const pathname = usePathname();
  const locale = useUiLocale();

  return (
    <nav className="border-coffee/8 bg-surface fixed right-0 bottom-0 left-0 z-[70] grid grid-cols-4 border-t px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
      {items.map((item) => {
        const active = isRouteActive(pathname, item.routeId);
        return (
          <Link
            key={item.routeId}
            href={localizedPath(item.routeId, { locale })}
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
