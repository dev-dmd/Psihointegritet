"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/helpers/cn";
import type { UiLocale } from "@/i18n/locales";
import { localizedPath } from "@/lib/routes/localized-path";
import { isRouteActive } from "@/lib/routes/match";
import type { PlatformRouteId } from "@/lib/routes/platform-routes";
import { useUiLocale } from "@/i18n/use-ui-locale";
import type { EnWorkspace } from "@/messages/en/workspace";

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
  routeId: PlatformRouteId;
  labelKey: keyof EnWorkspace["superadmin"]["nav"];
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  /** Mono count badge (Tenanti). */
  badge?: string;
}

const mainNav: NavItem[] = [
  { routeId: "superadmin.home", labelKey: "home", icon: GridIcon },
  {
    routeId: "superadmin.tenants.list",
    labelKey: "tenants",
    icon: BuildingIcon,
    badge: "1",
  },
  { routeId: "superadmin.features", labelKey: "features", icon: GatesIcon },
  {
    routeId: "superadmin.diagnostics",
    labelKey: "diagnostics",
    icon: ActivityIcon,
  },
];

const soonNav: NavItem[] = [
  { routeId: "superadmin.billing", labelKey: "billing", icon: CardIcon },
];

const systemNav: NavItem[] = [
  { routeId: "superadmin.auditLog", labelKey: "auditLog", icon: FileIcon },
  { routeId: "superadmin.settings", labelKey: "settings", icon: SlidersIcon },
];

/** Fixed coffee sidebar (desktop ≥1024px) — 1:1 with the prototype. */
export function SuperadminSidebar() {
  const pathname = usePathname();
  const locale = useUiLocale();
  const t = useTranslations("workspace");
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
          const active = isRouteActive(pathname, item.routeId);
          return (
            <Link
              key={item.routeId}
              href={localizedPath(item.routeId, { locale })}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-[11px] text-sm font-semibold no-underline transition-colors duration-200",
                active
                  ? "bg-warm/18 text-panel-canvas"
                  : "text-panel-canvas/62 hover:bg-panel-canvas/8",
              )}
            >
              <item.icon />
              {t(`superadmin.nav.${item.labelKey}`)}
              {item.badge ? (
                <span className="bg-panel-canvas/14 text-panel-canvas ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-bold">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        {soonNav.map((item) => (
          <SoonNavLink key={item.routeId} item={item} locale={locale} />
        ))}
        <div className="text-panel-canvas/35 mx-3 mt-[18px] mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
          Sistem
        </div>
        {systemNav.map((item) => (
          <SoonNavLink key={item.routeId} item={item} locale={locale} />
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
function SoonNavLink({ item, locale }: { item: NavItem; locale: UiLocale }) {
  const t = useTranslations("workspace");
  return (
    <Link
      href={localizedPath(item.routeId, { locale })}
      className="text-panel-canvas/42 hover:bg-panel-canvas/6 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors duration-200"
    >
      <item.icon />
      {t(`superadmin.nav.${item.labelKey}`)}
      <span className="text-warm ml-auto text-[9.5px] font-semibold tracking-[0.08em] uppercase">
        {t("nav.soon")}
      </span>
    </Link>
  );
}
