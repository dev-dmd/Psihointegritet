"use client";

import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { BackToSiteMenuItem } from "@/components/shared/back-to-site-button";
import { LogoutAvatarMenu } from "@/components/shared/logout-avatar-menu";
import { getInitials } from "@/lib/auth/clerk/initials";

/**
 * Client panel header („KP header" in the design handoff): wordmark, the
 * notification bell, and the avatar that opens sign-out.
 *
 * The bell is a placeholder on purpose — there is no notification store yet,
 * so it says so when tapped rather than opening an empty tray. The unread dot
 * from the design is deliberately not drawn: a dot that is always on is a lie
 * about state, and it is the one element here that would have to become real
 * before it can be shown.
 *
 * „Glavni sajt" moves inside the avatar dropdown rather than sitting beside
 * the bell — the panel column is 480px wide at every viewport, and three
 * controls crowd it.
 */
export function AccountTopbar() {
  const { user } = useUser();
  const t = useTranslations("account.topbar");

  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = getInitials(user?.firstName, user?.lastName, email);

  return (
    <header className="bg-panel-canvas/92 border-coffee/8 sticky top-0 z-40 flex items-center gap-3 border-b px-[22px] py-3.5 backdrop-blur-md">
      <span className="flex items-baseline">
        <span className="text-forest font-serif text-xl font-medium">
          Psihointegritet
        </span>
        <span
          aria-hidden
          className="bg-warm ml-[3px] h-[5px] w-[5px] rounded-full"
        />
      </span>
      <span className="flex-1" />
      <button
        type="button"
        title={t("notifications")}
        aria-label={t("notifications")}
        onClick={() => toast(t("noNotifications"))}
        className="border-coffee/10 text-coffee hover:border-sage bg-surface relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
      >
        <svg
          aria-hidden
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </button>
      <LogoutAvatarMenu
        initials={initials}
        label={t("userMenu")}
        triggerClassName="bg-meadow/45 text-forest hover:bg-meadow/60 focus-visible:ring-forest/35 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 text-[12.5px] font-semibold tracking-[0.04em] outline-none transition-colors focus-visible:ring-2"
      >
        <BackToSiteMenuItem />
      </LogoutAvatarMenu>
    </header>
  );
}
