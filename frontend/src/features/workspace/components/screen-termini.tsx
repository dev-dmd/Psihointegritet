"use client";

import { useState } from "react";

import { ProgressBar } from "@/components/panel/progress-bar";
import { StatusBadge } from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";

import { useTranslations } from "next-intl";

import { useUiLocale } from "@/i18n/use-ui-locale";

import { appointmentRequests, waitlist, workspaceDemo } from "../data";
import { STATUS_META, isFreeSlot } from "../types";
import { useStatusLabel } from "../use-status-label";
import { useWorkspace } from "../workspace-context";
import { AgendaRow } from "./agenda-row";
import { PageHeader } from "./page-header";

/**
 * Tab ids are stable and Serbian; only the labels are translated. The id is
 * component state and appears in no URL, so renaming it would buy nothing.
 */
const TAB_IDS = [
  "danas",
  "nedelja",
  "predstojeci",
  "zahtevi",
  "cekanje",
] as const;

const TAB_KEYS = {
  danas: "today",
  nedelja: "week",
  predstojeci: "upcoming",
  zahtevi: "requests",
  cekanje: "waitlist",
} as const;

export function ScreenTermini() {
  const statusLabel = useStatusLabel();
  const locale = useUiLocale();
  const t = useTranslations("screens.appointments");
  const tabs = TAB_IDS.map((id) => ({
    id,
    label: t(`tabs.${TAB_KEYS[id]}`, { count: appointmentRequests.length }),
  }));
  const { todayAgenda, weekBars } = workspaceDemo(locale);
  const [tab, setTab] = useState("danas");
  const { selectedTherapistSlug } = useWorkspace();

  const agenda = selectedTherapistSlug
    ? todayAgenda.filter(
        (entry) =>
          isFreeSlot(entry) || entry.therapistSlug === selectedTherapistSlug,
      )
    : todayAgenda;

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Termini"
        description="Booking kontrola — jedan status sistem kroz celu platformu."
      />
      <TabPills tabs={tabs} activeId={tab} onChange={setTab} className="mb-5" />

      {tab === "danas" ? (
        <div className="rounded-panel border-line bg-surface border px-6 pt-2 pb-3.5">
          {agenda.map((entry, index) => (
            <AgendaRow key={`${entry.time}-${index}`} entry={entry} />
          ))}
        </div>
      ) : null}

      {tab === "nedelja" ? (
        <div className="rounded-panel border-line bg-surface border px-6 py-6">
          <div className="flex flex-col gap-4">
            {weekBars.map((bar) => (
              <div
                key={bar.day}
                className="grid grid-cols-[54px_1fr_44px] items-center gap-3.5"
              >
                <span className="text-coffee text-sm font-semibold">
                  {bar.day}
                </span>
                <ProgressBar
                  value={Math.round((bar.booked / bar.total) * 100)}
                />
                <span className="text-ink-55 text-right text-[13px]">
                  {bar.booked}/{bar.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "predstojeci" ? (
        <div className="rounded-panel border-line bg-surface border px-6 pt-2 pb-3.5">
          {todayAgenda
            .filter(
              (entry) => !isFreeSlot(entry) && entry.status === "potvrdjen",
            )
            .map((entry, index) => (
              <AgendaRow key={`upc-${index}`} entry={entry} />
            ))}
          <p className="text-ink-45 px-2 pt-3 pb-1 text-[12.5px] italic">
            {t("upcomingNote")}
          </p>
        </div>
      ) : null}

      {tab === "zahtevi" ? (
        <div className="flex flex-col gap-3">
          {appointmentRequests.map((request) => {
            const meta = STATUS_META[request.status];
            return (
              <div
                key={request.id}
                className="rounded-card border-line bg-surface border px-6 py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-coffee text-[15px] font-semibold">
                      {request.client}
                    </div>
                    <div className="text-ink-55 mt-0.5 text-[13px]">
                      {request.service} · {request.format} · {request.therapist}
                    </div>
                  </div>
                  <StatusBadge tone={meta.tone}>
                    {statusLabel(request.status)}
                  </StatusBadge>
                </div>
                <div className="text-ink-55 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                  <span>
                    {t("requested", { preferred: request.preferred })}
                  </span>
                  <span>Izvor: {request.source}</span>
                  <span>Poslato {request.ago}</span>
                </div>
              </div>
            );
          })}
          <p className="text-ink-45 px-1 text-[12.5px] italic">
            {t("requestNote")}
          </p>
        </div>
      ) : null}

      {tab === "cekanje" ? (
        <div className="flex flex-col gap-3">
          {waitlist.map((entry) => (
            <div
              key={entry.client}
              className="rounded-card border-line bg-surface flex items-center gap-4 border px-6 py-4"
            >
              <span className="bg-meadow/35 text-forest inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
                {entry.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-coffee text-[14.5px] font-semibold">
                  {entry.client}
                </div>
                <div className="text-ink-55 text-[12.5px]">
                  {entry.period} · {entry.format} · {entry.therapist}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
