"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";
import { localizedPath } from "@/lib/routes/localized-path";
import { isRouteActive } from "@/lib/routes/match";
import { useUiLocale } from "@/i18n/use-ui-locale";

import { useWorkspace } from "../workspace-context";
import { usePanelErrors } from "../panel-errors";
import { visibleNav } from "../nav";
import { PowerIcon } from "./icons";
import { getInitials } from "@/lib/auth/clerk/initials";

/**
 * `getInitials` takes name parts, and the identity contract carries one string —
 * the provider may hold a full name, a first name only, or an email. Splitting
 * on the first space is the honest reading of that.
 */
function splitName(name: string): [string, string | null] {
  const [first, ...rest] = name.trim().split(/\s+/);
  return [first ?? name, rest.join(" ") || null];
}

/** Number of open requests shown on the Termini badge (demo). */
const REQUEST_COUNT = 3;

/** Fixed forest sidebar (desktop ≥1024px), nav derived from the real roles. */
export function WorkspaceSidebar() {
  const pathname = usePathname();
  const locale = useUiLocale();
  const t = useTranslations("workspace");
  const { signOut } = useClerk();
  const { isAdmin, isTherapist, displayName, roleLabelKey } = useWorkspace();
  const { hasErrorFor } = usePanelErrors();
  const sections = visibleNav({ isAdmin, isTherapist });

  return (
    <aside className="bg-forest fixed top-0 bottom-0 left-0 z-50 hidden w-[264px] flex-col lg:flex">
      <div className="flex items-baseline px-6 pt-[26px] pb-[18px]">
        <span className="text-canvas font-serif text-[23px] font-medium tracking-[-0.01em]">
          {t("brand.name")}
        </span>
        <span
          aria-hidden
          className="bg-warm ml-1 inline-block h-1.5 w-1.5 rounded-full"
        />
      </div>
      <div className="text-meadow/75 px-6 pb-3.5 text-[10.5px] font-semibold tracking-[0.16em] uppercase">
        {t("brand.panel")}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 pt-1 pb-4">
        {sections.map((section, index) => (
          <div key={section.captionKey ?? `section-${index}`}>
            {section.captionKey ? (
              <div className="text-canvas/38 mx-3 mt-[18px] mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
                {t(`nav.sections.${section.captionKey}`)}
              </div>
            ) : null}
            {section.items.map((item) =>
              item.soon ? (
                <span
                  key={t(`nav.${item.labelKey}`)}
                  className="text-canvas/45 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
                >
                  <item.icon />
                  {t(`nav.${item.labelKey}`)}
                  <span className="text-warm ml-auto text-[9.5px] font-semibold tracking-[0.08em] uppercase">
                    {t("nav.soon")}
                  </span>
                </span>
              ) : (
                <Link
                  key={t(`nav.${item.labelKey}`)}
                  href={localizedPath(item.routeId, { locale })}
                  className={cn(
                    // Border is always present but transparent, so flagging an
                    // error never shifts the row by a pixel.
                    "flex items-center gap-3 rounded-xl border border-transparent px-3 py-[11px] text-sm font-semibold no-underline transition-colors duration-200",
                    isRouteActive(pathname, item.routeId)
                      ? "bg-canvas/12 text-canvas"
                      : "text-canvas/62 hover:bg-canvas/8",
                    // A tab holding an error reads like the active tab, set
                    // apart only by a thin red outline.
                    hasErrorFor(item.routeId) &&
                      "border-danger/80 bg-canvas/12 text-canvas",
                  )}
                >
                  <item.icon />
                  {t(`nav.${item.labelKey}`)}
                  {hasErrorFor(item.routeId) ? (
                    <span className="sr-only">{t("nav.hasError")}</span>
                  ) : null}
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
          {displayName
            ? getInitials(...splitName(displayName))
            : isAdmin
              ? "A"
              : "T"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-canvas truncate text-[13.5px] font-semibold">
            {displayName ?? t("shell.memberName")}
          </div>
          <div className="text-canvas/50 text-[11.5px]">
            {t(`roles.${roleLabelKey}`)}
          </div>
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
