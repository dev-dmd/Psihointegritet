"use client";

import type { Route } from "next";
import Link from "next/link";

import type { CompassExperience } from "../api/flow";

function contentHref(contentType: string, slug: string): Route {
  if (contentType === "service") return `/usluge/${slug}` as Route;
  if (contentType === "program") return `/programi/${slug}` as Route;
  return `/${slug}` as Route;
}

export function CompassResults({
  titleId,
  experience,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onReset,
  onRequestSupport,
  onClose,
}: {
  titleId: string;
  experience: CompassExperience | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit: () => void;
  onReset: () => void;
  onRequestSupport: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <header className="border-line shrink-0 border-b px-5 pt-2 pb-4 md:px-8">
        <div className="mx-auto flex max-w-[900px] items-start justify-between gap-4">
          <div>
            <p className="text-sage text-[11.5px] font-semibold tracking-[0.16em] uppercase">
              Kompas rezultat
            </p>
            <h2
              id={titleId}
              className="text-forest mt-1.5 font-serif text-[24px]"
            >
              {experience?.summary.title ?? "Pripremamo prikaz…"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori Kompas"
            className="border-line-strong h-11 w-11 rounded-full border"
          >
            ✕
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto max-w-[900px]">
          {isLoading ? (
            <p className="text-coffee/70 py-10 text-center">
              Učitavamo preporuke…
            </p>
          ) : null}
          {isError ? (
            <div className="border-danger/40 rounded-panel border px-6 py-8 text-center">
              <p className="font-semibold">Preporuke trenutno nisu dostupne.</p>
              <button
                type="button"
                onClick={onRetry}
                className="text-forest mt-3 min-h-11 underline"
              >
                Pokušajte ponovo
              </button>
            </div>
          ) : null}
          {experience?.selectionAdjustments.map((adjustment) => (
            <p
              key={adjustment.code}
              className="bg-badge-amber-bg text-badge-amber mb-3 rounded-lg px-4 py-3 text-[13px]"
            >
              {adjustment.message}
            </p>
          ))}
          {experience?.sections.map((section) => (
            <section
              key={section.sectionId}
              className="border-line border-b py-6 last:border-0"
            >
              <h3 className="text-forest font-serif text-[21px]">
                {section.title}
              </h3>
              {section.contentItems.length === 0 &&
              section.taxonomyItems.length === 0 &&
              section.sectionId !== "professional-support" ? (
                <p className="text-coffee/60 mt-3 text-[13.5px]">
                  Za ovaj izbor trenutno nema objavljenog sadržaja u sekciji.
                </p>
              ) : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {section.contentItems.map((item) => (
                  <Link
                    key={item.card.itemKey}
                    href={contentHref(item.card.contentType, item.card.slug)}
                    onClick={onClose}
                    className="rounded-card border-line bg-surface border px-5 py-5"
                  >
                    <span className="text-sage text-[11px] font-semibold uppercase">
                      {item.card.contentFormat}
                    </span>
                    <h4 className="text-forest mt-2 font-serif text-[19px]">
                      {item.card.seo.title}
                    </h4>
                    <p className="text-coffee/70 mt-2 text-[13.5px]">
                      {item.card.seo.description}
                    </p>
                    <ul className="text-coffee/65 mt-3 text-[12.5px]">
                      {item.reasons.map((reason) => (
                        <li key={reason.code}>· {reason.text}</li>
                      ))}
                    </ul>
                  </Link>
                ))}
                {section.taxonomyItems.map((item) =>
                  item.canonicalPath ? (
                    <Link
                      key={item.stableId}
                      href={item.canonicalPath as Route}
                      onClick={onClose}
                      className="rounded-card border-line bg-surface border px-5 py-5"
                    >
                      <h4 className="text-forest font-serif text-[18px]">
                        {item.publicLabel}
                      </h4>
                      <p className="text-coffee/70 mt-2 text-[13px]">
                        {item.shortDescription}
                      </p>
                    </Link>
                  ) : null,
                )}
              </div>
              {section.sectionId === "professional-support" ? (
                <div className="bg-forest rounded-panel mt-4 px-6 py-6">
                  <p className="text-canvas/80 text-[13.5px]">
                    Kompas ne rangira terapeute i ne tvrdi da je kontekst prenet
                    pre vaše potvrde.
                  </p>
                  <button
                    type="button"
                    onClick={onRequestSupport}
                    className="bg-meadow text-kompas-on-meadow mt-4 min-h-11 rounded-full px-5 font-semibold"
                  >
                    Želim stručnu podršku →
                  </button>
                </div>
              ) : null}
            </section>
          ))}
          {!isLoading &&
          !isError &&
          experience &&
          experience.sections.every(
            (section) => section.contentItems.length === 0,
          ) ? (
            <p className="border-line-strong rounded-panel border border-dashed px-6 py-8 text-center">
              Trenutno nema objavljenog sadržaja za ovaj izbor. Prikazujemo samo
              proverene DB rezultate.
            </p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="border-line-strong min-h-11 rounded-full border px-4"
            >
              Izmeni odgovore
            </button>
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 underline"
            >
              Poništi izbor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
