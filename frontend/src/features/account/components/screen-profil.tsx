"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Toggle } from "@/components/panel/toggle";
import { useUiLocale } from "@/i18n/use-ui-locale";
import { localizedPublicPath } from "@/lib/routes/public-path";
import { ChevronRightIcon } from "./icons";

/**
 * KP 04 „Profil" — identity, notification preferences and the documents the
 * client agreed to, ending in sign-out.
 *
 * The three switches are rendered `disabled`: there is no notification
 * preference store, and a switch that flips and forgets is a worse lie than
 * one that visibly cannot be moved. Their positions show what the platform
 * does today — confirmations and reminders are handled by the therapist, and
 * nothing is sent as marketing.
 *
 * The design's „Vaš terapeut" card is not here. A request carries its
 * therapist as a UUID with no client-readable lookup, and the panel must not
 * invent a name.
 */

const DOCUMENT_LINKS = [
  { routeId: "public.privacy", labelKey: "privacyPolicy" },
  { routeId: "public.bookingRules", labelKey: "bookingRules" },
  { routeId: "public.terms", labelKey: "terms" },
] as const;

const NOTIFICATION_ROWS = [
  { labelKey: "confirmationEmails", checked: true },
  { labelKey: "reminder24h", checked: false },
  { labelKey: "newsletter", checked: false },
] as const;

interface ScreenProfilProps {
  /** `null` when the account holds neither a name nor an email. */
  displayName: string | null;
  email: string | null;
  initials: string;
}

export function ScreenProfil({
  displayName,
  email,
  initials,
}: ScreenProfilProps) {
  const t = useTranslations("account.profile");
  const common = useTranslations("common");
  const locale = useUiLocale();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Clerk generates a default avatar for everyone; `hasImage` is what tells a
  // real upload from that placeholder.
  const avatarUrl = user?.hasImage ? user.imageUrl : null;

  return (
    <section className="animate-fade-up flex flex-col gap-3.5">
      <div className="flex items-center gap-4 px-0.5 py-1.5">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-meadow/45 text-forest flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-serif text-[23px]">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-forest mb-[3px] font-serif text-[26px] font-normal">
            {displayName ?? t("title")}
          </h1>
          <p className="text-ink-55 truncate text-[13px]">
            {email ?? t("noEmail")}
          </p>
        </div>
      </div>

      <div className="border-line bg-surface rounded-[20px] border px-5 py-2">
        <h2 className="text-sage px-0 pt-3 pb-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
          {t("notificationsTitle")}
        </h2>
        {NOTIFICATION_ROWS.map((row) => (
          <div
            key={row.labelKey}
            className="border-line flex items-center justify-between gap-3 border-b py-3.5 last:border-b-0"
          >
            <span className="text-coffee text-sm font-semibold">
              {t(row.labelKey)}
            </span>
            <Toggle
              checked={row.checked}
              onChange={() => undefined}
              disabled
              label={t(row.labelKey)}
            />
          </div>
        ))}
        <p className="text-ink-45 pt-1 pb-3.5 text-[11.5px] leading-[1.5]">
          {t("notificationsNote")}
        </p>
      </div>

      <div className="border-line bg-surface rounded-[20px] border px-5 py-2">
        <h2 className="text-sage px-0 pt-3 pb-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
          {t("documentsTitle")}
        </h2>
        {DOCUMENT_LINKS.map((link) => (
          <Link
            key={link.routeId}
            href={localizedPublicPath(link.routeId, { locale })}
            className="border-line text-coffee flex items-center justify-between gap-3 border-b py-3.5 text-sm font-semibold no-underline last:border-b-0"
          >
            {t(link.labelKey)}
            <span aria-hidden className="text-ink-45">
              <ChevronRightIcon />
            </span>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => signOut({ redirectUrl: "/" })}
        className="text-danger hover:bg-danger/10 min-h-[46px] cursor-pointer rounded-full border-0 bg-transparent p-3 text-sm font-bold transition-colors"
      >
        {common("shell.signOut")}
      </button>
    </section>
  );
}
