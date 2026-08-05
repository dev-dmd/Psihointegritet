"use client";

import { useLayoutEffect } from "react";

import type { ApiContentDiscovery } from "../../content-api";
import type { TaxonomyTerm } from "../../taxonomy-api";
import { useTaxonomyRegistryLookupQuery } from "../../hooks/use-taxonomy-registry";

// ---------------------------------------------------------------------------
// Helpers — human questions mapped to taxonomy axes
// ---------------------------------------------------------------------------

const AXIS_AUDIENCE = "audience";
const AXIS_GOAL = "content_goal";
const AXIS_JOURNEY = "journey_intent";

const QUESTION_LABELS: Record<string, string> = {
  audience: "Kome ovaj tekst može najviše da koristi?",
  goal: "Šta čitalac dobija iz ovog teksta?",
  journey: "Gde tekst može dalje da ga vodi?",
};

const QUESTION_HELPERS: Record<string, string> = {
  audience:
    "Možete izabrati više publika istovremeno. Na primer, korisno i za pojedinca i za roditelja.",
  goal: "Možete izabrati više ciljeva istovremeno.",
  journey: "Jedan izbor — ili istraživanje, ili stručna podrška, ili oba.",
};

function filterByAxis(
  terms: readonly TaxonomyTerm[],
  axis: string,
): TaxonomyTerm[] {
  return terms.filter(
    (term) =>
      term.axis === axis && (term.status === "published" || term.systemDefined),
  );
}

function idsFor(discovery: ApiContentDiscovery, axis: string): string[] {
  switch (axis) {
    case AXIS_AUDIENCE:
      return discovery.audienceTermIds;
    case AXIS_GOAL:
      return discovery.contentGoalTermIds;
    case AXIS_JOURNEY:
      return discovery.journeyIntentTermId
        ? [discovery.journeyIntentTermId]
        : [];
    default:
      return [];
  }
}

function applyIds(
  discovery: ApiContentDiscovery,
  axis: string,
  ids: string[],
): ApiContentDiscovery {
  switch (axis) {
    case AXIS_AUDIENCE:
      return { ...discovery, audienceTermIds: ids };
    case AXIS_GOAL:
      return { ...discovery, contentGoalTermIds: ids };
    case AXIS_JOURNEY:
      return { ...discovery, journeyIntentTermId: ids[0] ?? null };
    default:
      return discovery;
  }
}

const isMulti = (axis: string): boolean => axis !== AXIS_JOURNEY;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleCompassStep({
  discovery,
  onChange,
}: {
  discovery: ApiContentDiscovery;
  onChange: (next: ApiContentDiscovery) => void;
}) {
  const registry = useTaxonomyRegistryLookupQuery();

  // Auto-populate contentFormatTermId and accessLevelTermId from the
  // registry the moment it loads. These are system defaults (article,
  // public) and the author must not have to choose them — they are the
  // only values that actually work in v1.
  useLayoutEffect(() => {
    if (!registry.data) return;
    if (
      discovery.contentFormatTermId !== null &&
      discovery.accessLevelTermId !== null
    )
      return;
    const formatTerm = registry.data.terms.find(
      (term) => term.axis === "content_format" && term.systemDefined === true,
    );
    const accessTerm = registry.data.terms.find(
      (term) => term.axis === "access_level" && term.systemDefined === true,
    );
    if (
      formatTerm &&
      accessTerm &&
      (discovery.contentFormatTermId !== formatTerm.termId ||
        discovery.accessLevelTermId !== accessTerm.termId)
    ) {
      onChange({
        ...discovery,
        contentFormatTermId: formatTerm.termId,
        accessLevelTermId: accessTerm.termId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount + first data load
  }, [registry.data]);

  const autoFormat = "Članak — određeno automatski";
  const autoAccess = "Javno — svi posetioci mogu da čitaju";

  return (
    <section
      id="compass-step-kompas"
      className="rounded-panel border-line scroll-mt-24 border px-6 py-5"
    >
      <h2 className="text-forest font-serif text-[17px]">
        Kako Kompas koristi tekst
      </h2>

      {/* Auto-populated fields — not editable */}
      <div className="mt-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-ink-55 w-24 shrink-0 text-[12px]">Format</span>
          <span className="text-ink-70 text-[13px]">{autoFormat}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-55 w-24 shrink-0 text-[12px]">Pristup</span>
          <span className="text-ink-70 text-[13px]">{autoAccess}</span>
        </div>
      </div>

      {/* Questions */}
      {registry.isLoading ? (
        <p className="text-ink-55 mt-4 text-[13px]">Učitavanje…</p>
      ) : registry.isError ? (
        <p className="text-ink-55 mt-4 text-[12.5px] leading-[1.5]">
          Nije moguće učitati registar za Kompas podešavanja. Možete nastaviti
          da pišete.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {[AXIS_AUDIENCE, AXIS_GOAL, AXIS_JOURNEY].map((axis) => {
            const terms = filterByAxis(registry.data?.terms ?? [], axis);
            const selected = idsFor(discovery, axis);

            return (
              <div key={axis} className="flex flex-col gap-1.5">
                <p className="text-ink-70 text-[13px] font-medium">
                  {QUESTION_LABELS[axis]}
                </p>
                <p className="text-ink-45 text-[11.5px] leading-[1.45]">
                  {QUESTION_HELPERS[axis]}
                </p>

                {terms.length === 0 ? (
                  <p className="text-ink-45 text-[12px]">
                    Nema dostupnih opcija.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {terms.map((term) => {
                      const checked = selected.includes(term.termId);
                      return (
                        <label
                          key={term.termId}
                          className="text-ink-70 hover:bg-surface border-line rounded-tile flex cursor-pointer items-center gap-2 border px-3 py-2 text-[13px] transition-colors"
                        >
                          {isMulti(axis) ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? selected.filter((id) => id !== term.termId)
                                  : [...selected, term.termId];
                                onChange(applyIds(discovery, axis, next));
                              }}
                              className="accent-forest h-4 w-4"
                            />
                          ) : (
                            <input
                              type="radio"
                              name="journey"
                              checked={checked}
                              onChange={() =>
                                onChange(
                                  applyIds(discovery, axis, [term.termId]),
                                )
                              }
                              className="accent-forest h-4 w-4"
                            />
                          )}
                          <span>
                            {term.publicLabel}
                            {term.shortDescription ? (
                              <span className="text-ink-45 ml-1 text-[11px]">
                                — {term.shortDescription}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
