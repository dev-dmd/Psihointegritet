"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { TabPills } from "@/components/panel/tab-pills";
import { useUiLocale } from "@/i18n/use-ui-locale";

import { partitionRequests } from "../appointment-view";
import { accountBookingPath } from "../booking-entry";
import { useMyAppointmentRequests } from "../hooks/use-my-appointment-requests";
import { AppointmentRow } from "./appointment-row";

/**
 * KP 02 „Moji termini" — the client's own booking requests, split into open
 * ones and closed ones.
 *
 * The design's row-level actions („Zatraži pomeranje", „Otkaži termin") are
 * absent: both act on a confirmed `Appointment`, and the only endpoint that
 * cancels one is staff-authenticated. Adding buttons that cannot complete
 * would be worse than not offering them.
 */

/** Tab ids are component state and appear in no URL — only labels translate. */
const TABS = ["upcoming", "history"] as const;

export function ScreenTermini() {
  const t = useTranslations("account.appointments");
  const state = useTranslations("account.state");
  const locale = useUiLocale();
  const [tab, setTab] = useState<(typeof TABS)[number]>("upcoming");
  const { data, isPending, isError } = useMyAppointmentRequests();

  const { upcoming, history } = partitionRequests(data ?? []);
  const rows = tab === "upcoming" ? upcoming : history;

  return (
    <section className="animate-fade-up">
      <h1 className="text-forest mb-3.5 font-serif text-[28px] font-normal">
        {t("title")}
      </h1>

      <TabPills
        tabs={TABS.map((id) => ({ id, label: t(`tabs.${id}`) }))}
        activeId={tab}
        onChange={(id) => setTab(id as (typeof TABS)[number])}
        className="mb-4"
      />

      {isPending ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="bg-surface/70 h-[92px] animate-pulse rounded-[18px]" />
          <div className="bg-surface/70 h-[92px] animate-pulse rounded-[18px]" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isError ? (
            <p className="border-line bg-surface text-ink-70 rounded-[18px] border px-[18px] py-4 text-[13.5px]">
              {state("loadFailed")}
            </p>
          ) : null}

          {rows.length === 0 && !isError ? (
            <p className="border-coffee/18 text-ink-55 rounded-[18px] border-[1.5px] border-dashed px-[18px] py-6 text-center text-[13.5px]">
              {tab === "upcoming" ? t("emptyUpcoming") : t("emptyHistory")}
            </p>
          ) : null}

          <ul className="flex list-none flex-col gap-3 p-0">
            {rows.map((request) => (
              <AppointmentRow key={request.id} request={request} />
            ))}
          </ul>

          {tab === "upcoming" ? (
            <>
              <Link
                href={accountBookingPath(locale)}
                className="border-coffee/25 text-ink-55 hover:border-sage hover:text-forest flex min-h-12 items-center justify-center rounded-[18px] border-[1.5px] border-dashed px-4 py-4 text-[13.5px] font-semibold no-underline transition-colors"
              >
                {t("newAppointment")}
              </Link>
              <p className="text-ink-45 px-1 text-center text-[11.5px] leading-[1.5]">
                {t("timeNote")}
              </p>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
