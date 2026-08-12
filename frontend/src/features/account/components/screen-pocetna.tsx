"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { useUiLocale } from "@/i18n/use-ui-locale";
import { localizedPath } from "@/lib/routes/localized-path";

import { nextRequest } from "../appointment-view";
import { BOOKING_PATH } from "../booking-entry";
import { useMyAppointmentRequests } from "../hooks/use-my-appointment-requests";
import { BookIcon, PlusIcon } from "./icons";
import { NextAppointmentCard } from "./next-appointment-card";

/**
 * KP 01 „Početna" — greeting, the next-appointment card, two quick actions and
 * the programs teaser.
 *
 * The greeting name is resolved on the server and passed in: reading it from
 * Clerk on the client would render „Dobro jutro, ." for one frame on every
 * load, which is the first thing a client sees.
 */

/**
 * Local wall-clock greeting — the person reading the screen is the one being
 * greeted, so this follows their device, not the organization's timezone.
 */
function greetingKey(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function ScreenPocetna({ firstName }: { firstName: string | null }) {
  const t = useTranslations("account.home");
  const locale = useUiLocale();
  const format = useFormatter();
  const { data, isPending, isError } = useMyAppointmentRequests();

  const today = format.dateTime(new Date(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="animate-fade-up flex flex-col gap-4">
      <div>
        <h1 className="text-forest mb-[5px] font-serif text-[28px] leading-[1.12] font-normal">
          {firstName === null
            ? t("greetingPlain", { greeting: t(greetingKey()) })
            : t("greeting", { greeting: t(greetingKey()), name: firstName })}
        </h1>
        <p className="text-ink-55 text-sm">
          {today.charAt(0).toUpperCase() + today.slice(1)}
        </p>
      </div>

      <NextAppointmentCard
        request={data ? nextRequest(data) : null}
        isPending={isPending}
        isError={isError}
      />

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={BOOKING_PATH}
          className="border-sage/30 bg-meadow/32 hover:bg-meadow/45 flex min-h-[108px] flex-col justify-between gap-2.5 rounded-[20px] border p-[18px] no-underline transition-colors"
        >
          <span className="bg-surface text-forest flex h-9 w-9 items-center justify-center rounded-xl">
            <PlusIcon size={17} />
          </span>
          <span>
            <span className="text-forest block text-[14.5px] font-semibold">
              {t("book")}
            </span>
            <span className="text-ink-55 mt-0.5 block text-xs">
              {t("bookHint")}
            </span>
          </span>
        </Link>

        <Link
          href={localizedPath("account.programs", { locale })}
          className="border-warm/45 bg-warm/18 hover:bg-warm/30 flex min-h-[108px] flex-col justify-between gap-2.5 rounded-[20px] border p-[18px] no-underline transition-colors"
        >
          <span className="bg-surface text-badge-wait flex h-9 w-9 items-center justify-center rounded-xl">
            <BookIcon size={17} />
          </span>
          <span>
            <span className="text-coffee block text-[14.5px] font-semibold">
              {t("myPackage")}
            </span>
            <span className="text-ink-55 mt-0.5 block text-xs">
              {t("myPackageHint")}
            </span>
          </span>
        </Link>
      </div>

      <Link
        href={localizedPath("account.programs", { locale })}
        className="border-line bg-surface hover:shadow-panel-card block rounded-[20px] border p-5 no-underline transition-shadow"
      >
        <span className="mb-2.5 flex items-center justify-between gap-2.5">
          <span className="text-sage text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t("programsTitle")}
          </span>
          <span aria-hidden className="text-ink-45">
            →
          </span>
        </span>
        <span className="text-ink-55 block text-[13px] leading-[1.55]">
          {t("programsNote")}
        </span>
      </Link>
    </section>
  );
}
