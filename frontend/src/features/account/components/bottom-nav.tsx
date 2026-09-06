"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";
import { useUiLocale } from "@/i18n/use-ui-locale";
import { localizedPath } from "@/lib/routes/localized-path";
import { isRouteActive } from "@/lib/routes/match";

import { accountNavItems } from "../nav";

/**
 * The panel's primary navigation („KP navigacija"): four tabs pinned to the
 * bottom of the app column below `lg`, where the desktop sidebar takes over.
 *
 * Both read the same `accountNavItems`, so a tab cannot exist on one surface
 * and be missing from the other.
 */
export function AccountBottomNav() {
  const pathname = usePathname();
  const locale = useUiLocale();
  const t = useTranslations("account.nav");

  return (
    <nav className="border-coffee/8 bg-surface sticky bottom-0 z-50 grid grid-cols-4 border-t px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
      {accountNavItems.map((item) => {
        const active = isRouteActive(pathname, item.routeId);
        return (
          <Link
            key={item.routeId}
            href={localizedPath(item.routeId, { locale })}
            aria-current={active ? "page" : undefined}
            className="flex min-h-12 flex-col items-center justify-end gap-[3px] py-1 no-underline"
          >
            <span
              className={cn(
                "flex h-[26px] w-[42px] items-center justify-center rounded-full transition-colors",
                active ? "bg-meadow/55 text-forest" : "text-coffee/50",
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
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
