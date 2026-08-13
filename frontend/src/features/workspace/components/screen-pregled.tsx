"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { ProgressBar } from "@/components/panel/progress-bar";
import { useFallbackContent } from "@/content/use-content";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";

import { usePanelErrors } from "../panel-errors";
import { isFreeSlot } from "../types";
import { useWorkspace } from "../workspace-context";
import { AgendaRow } from "./agenda-row";

/**
 * Local wall-clock greeting.
 *
 * Reads the browser's hour rather than the organization's timezone: the person
 * looking at the screen is the one being greeted, and "Good evening" should
 * match their evening even when the centre sits in another zone.
 */
function greeting(t: ReturnType<typeof useTranslations<"screens.overview">>) {
  const hour = new Date().getHours();
  if (hour < 11) return t("morning");
  if (hour < 18) return t("afternoon");
  return t("evening");
}

export function ScreenPregled() {
  const t = useTranslations("screens.overview");
  const ta = useTranslations("screens.appointments");
  const locale = useUiLocale();
  const { priorityCards, researchSurvey, todayAgenda, weekBars } =
    useFallbackContent().workspaceDemo;
  const { isAdmin, selectedTherapistSlug } = useWorkspace();
  const { errors, clearError } = usePanelErrors();

  const cards = priorityCards.filter((card) => isAdmin || !card.adminOnly);
  const agenda = selectedTherapistSlug
    ? todayAgenda.filter(
        (entry) =>
          isFreeSlot(entry) || entry.therapistSlug === selectedTherapistSlug,
      )
    : todayAgenda;
  const weekTotal = weekBars.reduce((sum, w) => sum + w.total, 0);
  const weekBooked = weekBars.reduce((sum, w) => sum + w.booked, 0);
  const weekPct = Math.round((weekBooked / weekTotal) * 100);

  return (
    <section className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-forest mb-1.5 font-serif text-[26px] leading-[1.1] font-normal md:text-[34px]">
          {greeting(t)}.
        </h1>
        <p className="text-ink-55 text-[14.5px]">{t("lead")}</p>
      </div>

      {errors.length > 0 ? (
        <section
          aria-labelledby="panel-errors-heading"
          className="border-danger/45 bg-danger/8 rounded-panel mb-6 border px-5 py-4"
        >
          <h2
            id="panel-errors-heading"
            className="text-danger mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            {t("errors", { count: errors.length })}
          </h2>
          <ul className="flex flex-col gap-3">
            {errors.map((error) => (
              <li
                key={error.id}
                className="border-line bg-surface rounded-tile border px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-coffee text-sm font-semibold">
                      {error.title}
                    </p>
                    <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
                      {error.description}
                    </p>
                    {error.details.length > 0 ? (
                      <ul className="text-ink-70 mt-2 flex list-disc flex-col gap-1 pl-5 text-[12.5px] leading-[1.5]">
                        {error.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                    <Link
                      href={localizedPath(error.routeId, { locale })}
                      className="text-forest hover:text-sage border-coffee/25 mt-2.5 inline-block border-b-[1.5px] text-[13px] font-semibold no-underline transition-colors"
                    >
                      Otvorite „{error.tabLabel}“ →
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearError(error.id)}
                    aria-label={t("dismissError", { title: error.title })}
                    className="text-ink-55 hover:text-coffee shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-2 py-1 text-lg leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={localizedPath(card.routeId, { locale })}
            className="rounded-card border-line hover:shadow-panel-card bg-surface flex flex-col gap-1 border px-5 py-[18px] no-underline transition-all duration-[250ms] hover:-translate-y-[3px]"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-forest font-serif text-[34px] leading-none">
                {card.count}
              </span>
              <span
                aria-hidden
                className={
                  card.dot === "meadow"
                    ? "bg-meadow h-2 w-2 rounded-full"
                    : card.dot === "warm"
                      ? "bg-warm h-2 w-2 rounded-full"
                      : "bg-danger h-2 w-2 rounded-full"
                }
              />
            </span>
            <span className="text-coffee mt-1.5 text-sm font-semibold">
              {card.title}
            </span>
            <span className="text-ink-55 text-[12.5px] leading-[1.45]">
              {card.description}
            </span>
            <span className="text-forest mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold">
              {card.cta} <span className="text-sage">→</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[7fr_5fr]">
        <div className="rounded-panel border-line bg-surface border px-6 pt-6 pb-3.5">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <h2 className="text-forest font-serif text-[22px] font-normal">
              {t("todaySchedule")}
            </h2>
            <Link
              href={localizedPath("workspace.appointments.list", { locale })}
              className="text-forest hover:text-sage border-coffee/25 border-b-[1.5px] text-[13px] font-semibold no-underline transition-colors"
            >
              {ta("allAppointments")}
            </Link>
          </div>
          {agenda.map((entry, index) => (
            <AgendaRow key={`${entry.time}-${index}`} entry={entry} />
          ))}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="bg-forest rounded-panel px-6 py-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-canvas font-serif text-xl font-normal">
                {ta("thisWeek")}
              </h2>
              <span className="text-meadow text-xs font-semibold">
                {ta("occupancy", { percent: weekPct })}
              </span>
            </div>
            <div className="flex flex-col gap-[11px]">
              {weekBars.map((bar) => (
                <div
                  key={bar.day}
                  className="grid grid-cols-[34px_1fr_34px] items-center gap-3"
                >
                  <span className="text-canvas/65 text-xs font-semibold">
                    {bar.day}
                  </span>
                  <ProgressBar
                    value={Math.round((bar.booked / bar.total) * 100)}
                    tone="dark"
                  />
                  <span className="text-canvas/60 text-right text-xs">
                    {bar.booked}/{bar.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isAdmin ? (
            <Link
              href={localizedPath("workspace.research", { locale })}
              className="bg-warm/16 border-warm/45 rounded-panel hover:bg-warm/28 block px-6 py-[22px] no-underline transition-colors"
            >
              <div className="text-ink-55 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                {t("research")}
              </div>
              <div className="text-coffee mb-1 font-serif text-xl">
                {t("newResponses", { count: 18 })}
              </div>
              <div className="text-ink-55 text-[13px]">
                {t("surveyProgress", {
                  survey: `„${researchSurvey.name}“`,
                  rate: "72%",
                })}
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
