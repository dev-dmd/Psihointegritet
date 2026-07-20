"use client";

import type { Route } from "next";
import Link from "next/link";

import { ProgressBar } from "@/components/panel/progress-bar";

import { priorityCards, todayAgenda, weekBars } from "../data";
import { isFreeSlot } from "../types";
import { useWorkspace } from "../workspace-context";
import { AgendaRow } from "./agenda-row";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Dobro jutro";
  if (hour < 18) return "Dobar dan";
  return "Dobro veče";
}

export function ScreenPregled() {
  const { isAdmin, selectedTherapistSlug } = useWorkspace();

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
          {greeting()}.
        </h1>
        <p className="text-ink-55 text-[14.5px]">
          Evo šta danas traži vašu pažnju.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href as Route}
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
              Današnji raspored
            </h2>
            <Link
              href="/radni-prostor/termini"
              className="text-forest hover:text-sage border-coffee/25 border-b-[1.5px] text-[13px] font-semibold no-underline transition-colors"
            >
              Svi termini →
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
                Ova nedelja
              </h2>
              <span className="text-meadow text-xs font-semibold">
                Popunjenost {weekPct}%
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
              href="/radni-prostor/istrazivanja"
              className="bg-warm/16 border-warm/45 rounded-panel hover:bg-warm/28 block px-6 py-[22px] no-underline transition-colors"
            >
              <div className="text-ink-55 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Istraživanja
              </div>
              <div className="text-coffee mb-1 font-serif text-xl">
                +18 novih odgovora ove nedelje
              </div>
              <div className="text-ink-55 text-[13px]">
                {`„Šta vas sprečava da zakažete prvi razgovor?“ · completion 72%`}
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
