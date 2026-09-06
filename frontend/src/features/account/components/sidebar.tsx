"use client";

import { useClerk } from "@clerk/nextjs";
import { PowerIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";
import { useUiLocale } from "@/i18n/use-ui-locale";
import { localizedPath } from "@/lib/routes/localized-path";
import { isRouteActive } from "@/lib/routes/match";

import { accountNavItems } from "../nav";

/**
 * Fixed forest sidebar (desktop ≥1024px) — the same shell the Control Center
 * uses, carrying the client panel's four tabs.
 *
 * The handoff only drew the phone frame, so this mirrors
 * `features/workspace/components/sidebar.tsx` rather than inventing a second
 * desktop language: same width, same brand block, same active-row treatment,
 * same identity row with sign-out at the foot. Below `lg` it does not render
 * at all and the bottom tab bar takes over.
 *
 * Identity is resolved on the server and passed in, so the row never renders
 * nameless for a frame.
 */
interface AccountSidebarProps {
  displayName: string | null;
  email: string | null;
  initials: string;
}

export function AccountSidebar({
  displayName,
  email,
  initials,
}: AccountSidebarProps) {
  const pathname = usePathname();
  const locale = useUiLocale();
  const t = useTranslations("account");
  const common = useTranslations("common");
  const { signOut } = useClerk();

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
        {t("brand.panel")}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 pt-1 pb-4">
        {accountNavItems.map((item) => {
          const active = isRouteActive(pathname, item.routeId);
          return (
            <Link
              key={item.routeId}
              href={localizedPath(item.routeId, { locale })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-[11px] text-sm font-semibold no-underline transition-colors duration-200",
                active
                  ? "bg-canvas/12 text-canvas"
                  : "text-canvas/62 hover:bg-canvas/8",
              )}
            >
              <item.icon size={17} />
              {t(`nav.${item.labelKey}`)}
            </Link>
          );
        })}
      </nav>

      <div className="border-canvas/10 flex items-center gap-[11px] border-t px-[18px] pt-4 pb-5">
        <span className="border-meadow/55 bg-forest-lift text-canvas inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-canvas truncate text-[13.5px] font-semibold">
            {displayName ?? t("profile.title")}
          </div>
          {email ? (
            <div className="text-canvas/50 truncate text-[11.5px]">{email}</div>
          ) : null}
        </div>
        <button
          type="button"
          title={common("shell.signOut")}
          aria-label={common("shell.signOut")}
          onClick={() => signOut({ redirectUrl: "/" })}
          className="text-canvas/45 hover:bg-danger/25 hover:text-canvas flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent transition-colors"
        >
          <PowerIcon className="size-4" />
        </button>
      </div>
    </aside>
  );
}
