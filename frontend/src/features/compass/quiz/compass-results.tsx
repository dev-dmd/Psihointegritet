"use client";

import type { Route } from "next";
import Link from "next/link";

import { compassFallbackRegistry } from "../fallback-registry";
import type { CompassPreviewResult } from "../model/fallback-recommendation";
import type { CompassSelection } from "../model/selection";

function selectionChips(selection: CompassSelection): string[] {
  const registry = compassFallbackRegistry;
  const chips: string[] = [];

  const area = registry.areas.find(
    (item) => item.stableId === selection.topicGroupId,
  );
  if (area) chips.push(area.label);

  for (const topicId of selection.topicIds) {
    const topic = registry.areas
      .flatMap((item) => item.topics)
      .find((item) => item.stableId === topicId);
    if (topic) chips.push(topic.label);
  }

  for (const audienceId of selection.audienceIds) {
    const audience = registry.audiences.find((item) => item.id === audienceId);
    if (audience) chips.push(audience.label);
  }

  for (const goalId of selection.goalIds) {
    const goal = registry.goals.find((item) => item.id === goalId);
    if (goal) chips.push(goal.label);
  }

  return chips;
}

/**
 * Where a result card leads.
 *
 * Content items are not published yet, so a card cannot link to its own page.
 * It links to the canonical page of the most specific taxonomy term behind it —
 * the topic when the card has one, otherwise its area — which is a real page
 * that exists and keeps the flow continuous instead of dead-ending.
 */
function cardHref(card: CompassPreviewResult["card"]): Route {
  const topic = card.topicStableIds[0];
  if (topic) return `/kompas/tema/${topic}` as Route;
  return `/kompas/oblast/${card.areaStableId}` as Route;
}

function AccessBadge({ level }: { level: "public" | "registered" }) {
  const isPublic = level === "public";
  return (
    <span
      className={
        isPublic
          ? "bg-badge-ok-bg text-badge-ok rounded-full px-2.5 py-1 text-[11px] font-semibold"
          : "bg-badge-amber-bg text-badge-amber rounded-full px-2.5 py-1 text-[11px] font-semibold"
      }
    >
      {isPublic ? "Javno dostupno" : "Za registrovane"}
    </span>
  );
}

/**
 * Result view of the Kompas flow.
 *
 * Cards carry at most three plain-language reasons and never a numeric score
 * (KOMPAS_TODO §8). Nothing here selects or ranks a therapist — the only route
 * to professional support is the explicit handoff button, which the caller
 * wires to the existing Intake flow.
 */
export function CompassResults({
  titleId,
  results,
  selection,
  onEdit,
  onReset,
  onRequestSupport,
  onClose,
}: {
  titleId: string;
  results: readonly CompassPreviewResult[];
  selection: CompassSelection;
  onEdit: () => void;
  onReset: () => void;
  onRequestSupport: () => void;
  onClose: () => void;
}) {
  const chips = selectionChips(selection);

  return (
    <div className="flex min-h-0 flex-col">
      <header className="border-line shrink-0 border-b px-5 pt-2 pb-4 md:px-8">
        <div className="mx-auto max-w-[900px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sage text-[11.5px] font-semibold tracking-[0.16em] uppercase">
                Predlog za vas
              </p>
              <h2
                id={titleId}
                className="text-forest mt-1.5 font-serif text-[22px] leading-[1.2] md:text-[26px]"
              >
                {results.length > 0
                  ? "Sadržaji koji bi vam sada mogli pomoći"
                  : "Polazni izbor"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zatvori Kompas"
              className="border-line-strong text-coffee/70 hover:border-coffee/40 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border"
            >
              ✕
            </button>
          </div>

          {chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="border-line-strong text-coffee/75 rounded-full border px-3 py-1 text-[12px]"
                >
                  {chip}
                </span>
              ))}
              <button
                type="button"
                onClick={onEdit}
                className="text-forest hover:text-forest-soft min-h-11 cursor-pointer text-[12.5px] font-semibold underline underline-offset-4"
              >
                Izmeni odgovore
              </button>
              <button
                type="button"
                onClick={onReset}
                className="text-coffee/60 hover:text-coffee min-h-11 cursor-pointer text-[12.5px] underline underline-offset-4"
              >
                Poništi podešavanje
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto max-w-[900px]">
          {results.length === 0 ? (
            <div className="border-line-strong rounded-panel border border-dashed px-6 py-10 text-center">
              <p className="text-coffee text-[14.5px] font-semibold">
                Nema sadržaja za ovaj izbor
              </p>
              <p className="text-coffee/70 mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-[1.6]">
                Pokušajte sa širom oblašću ili pogledajte sve oblasti. Ne
                prikazujemo nepovezan sadržaj samo da lista ne bi bila prazna.
              </p>
              <button
                type="button"
                onClick={onEdit}
                className="border-line-strong text-coffee/75 hover:border-coffee/40 mt-5 min-h-11 cursor-pointer rounded-full border px-5 text-[13.5px] font-semibold"
              >
                Izmeni odgovore
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map(({ card, reasons }) => (
                <Link
                  key={card.id}
                  href={cardHref(card)}
                  onClick={onClose}
                  className="rounded-card border-line bg-surface hover:shadow-card-hover hover:border-forest/25 flex flex-col gap-3 border px-5 py-5 transition-shadow"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-badge-soft-bg text-badge-soft rounded-full px-2.5 py-1 text-[11px] font-semibold">
                      {card.kind}
                    </span>
                    <span className="text-coffee/55 text-[11.5px]">
                      {card.duration}
                    </span>
                    <span className="ml-auto">
                      <AccessBadge level={card.accessLevel} />
                    </span>
                  </div>

                  <h3 className="text-forest font-serif text-[19px] leading-[1.25]">
                    {card.title}
                  </h3>
                  <p className="text-coffee/70 text-[13.5px] leading-[1.6]">
                    {card.description}
                  </p>

                  {reasons.length > 0 ? (
                    <div className="border-line mt-1 border-t pt-3">
                      <p className="text-ink-45 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
                        Zašto ovo vidite
                      </p>
                      <ul className="text-coffee/70 mt-1.5 flex flex-col gap-1 text-[12.5px]">
                        {reasons.map((reason) => (
                          <li key={reason.code}>· {reason.label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <span className="text-forest mt-auto pt-1 text-[13px] font-semibold">
                    Otvori →
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="border-line mt-8 flex flex-wrap gap-2.5 border-t pt-6">
            <Link
              href="/kompas/oblasti"
              onClick={onClose}
              className="border-line-strong text-coffee/75 hover:border-coffee/40 inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px] font-semibold"
            >
              Sve oblasti
            </Link>
            <Link
              href="/kompas/teme"
              onClick={onClose}
              className="border-line-strong text-coffee/75 hover:border-coffee/40 inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px] font-semibold"
            >
              Sve teme
            </Link>
          </div>

          <section className="bg-forest rounded-panel mt-8 px-6 py-7 md:px-8">
            <h3 className="text-canvas font-serif text-[21px] leading-[1.25]">
              Želite razgovor sa stručnom osobom?
            </h3>
            <p className="text-canvas/75 mt-2 max-w-[58ch] text-[13.5px] leading-[1.6]">
              Kompas ne bira terapeuta. Prenosimo samo neutralan kontekst koji
              ste izabrali, a vi potvrđujete šta ide dalje.
            </p>
            <button
              type="button"
              onClick={onRequestSupport}
              className="bg-meadow text-kompas-on-meadow hover:bg-meadow-hover mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
            >
              Želim stručnu pomoć
              <span aria-hidden>→</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
