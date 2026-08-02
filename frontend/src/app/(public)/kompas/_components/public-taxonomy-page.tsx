import type { Route } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/shared/json-ld";
import { countSr } from "@/helpers/plural-sr";
import {
  compassBreadcrumbJsonLd,
  compassPageDiscoverability,
} from "@/lib/compass/discoverability";
import {
  publicCompassContentCardView,
  routablePublicTerm,
} from "@/lib/compass/taxonomy-view";
import type {
  CompassRouteKind,
  PublicTaxonomyPageAggregate,
  RoutablePublicTaxonomyTerm,
} from "@/lib/compass/types";

import { CompassPageHero } from "./compass-page-hero";
import { CompassContentCard } from "./content-card";

interface PublicTaxonomyPageProps {
  aggregate: PublicTaxonomyPageAggregate;
  routeKind: CompassRouteKind;
}

function uniqueRoutableTopics(
  terms: PublicTaxonomyPageAggregate["children"],
): RoutablePublicTaxonomyTerm[] {
  const seen = new Set<string>();
  return terms.flatMap((term) => {
    const routable = routablePublicTerm(term, "tema");
    if (!routable || seen.has(routable.stableId)) return [];
    seen.add(routable.stableId);
    return [routable];
  });
}

/**
 * `/kompas/oblast/[slug]` and `/kompas/tema/[slug]`.
 *
 * Both are stacked cards inside the site container, not a two-column layout:
 * the aside that used to hold „Pripada oblasti" duplicated the breadcrumb, and
 * on a page whose whole job is to offer a next step, the ways onward belong in
 * the reading flow rather than in a column people scroll past.
 *
 * An area with no published content renders the designed empty state and still
 * offers related areas and professional help. That is the common case today —
 * the registry has no published content links at all — so the empty state is
 * the page, not an edge case.
 */
export function PublicTaxonomyPage({
  aggregate,
  routeKind,
}: PublicTaxonomyPageProps) {
  const record = compassPageDiscoverability(aggregate, routeKind);
  const term = routablePublicTerm(aggregate.term, routeKind);
  if (!term) throw new Error("Compass page received a non-routable term.");

  const isArea = routeKind === "oblast";
  const parent = aggregate.parent
    ? routablePublicTerm(aggregate.parent, "oblast")
    : null;
  const children = uniqueRoutableTopics(aggregate.children);
  const related = uniqueRoutableTopics(aggregate.relatedTerms).filter(
    (item) => item.stableId !== term.stableId,
  );
  const contentCards = aggregate.contentCards.flatMap((card) => {
    const view = publicCompassContentCardView(card);
    return view ? [view] : [];
  });

  const meta = [
    isArea ? countSr(children.length, "tema", "teme", "tema") : null,
    countSr(
      contentCards.length,
      "objavljen sadržaj",
      "objavljena sadržaja",
      "objavljenih sadržaja",
    ),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <>
      <JsonLd data={compassBreadcrumbJsonLd(record)} />

      <section id="vrh" className="scroll-mt-24 pt-6">
        <div className="mx-auto max-w-[1536px] px-5 pb-[72px] md:px-8 md:pb-24">
          <CompassPageHero
            breadcrumbs={record.breadcrumbs}
            eyebrow={isArea ? "Oblast" : "Tema"}
            title={term.publicLabel}
            lead={term.shortDescription}
            tone={isArea ? "meadow" : "surface"}
          >
            <p className="text-coffee/70 mt-4 text-[12px] tracking-[0.06em] uppercase">
              {meta}
            </p>
          </CompassPageHero>

          {isArea && children.length > 0 ? (
            <section
              aria-labelledby="kompas-children-title"
              className="bg-surface mt-3 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
            >
              <h2
                id="kompas-children-title"
                className="text-forest mb-4 font-serif text-[24px] font-normal"
              >
                Teme u ovoj oblasti
              </h2>
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))] gap-2">
                {children.map((child) => (
                  <Link
                    key={child.stableId}
                    href={child.canonicalPath as Route}
                    className="border-coffee/10 bg-surface hover:border-coffee/25 hover:shadow-card-hover flex flex-col gap-1.5 rounded-[16px] border p-4 transition-[border-color,box-shadow]"
                  >
                    <span className="text-forest font-serif text-[19px]">
                      {child.publicLabel}
                    </span>
                    {child.shortDescription ? (
                      <span className="text-coffee/62 text-[13px] leading-[1.55]">
                        {child.shortDescription}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section
            aria-labelledby="kompas-content-title"
            className="bg-surface mt-3 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
          >
            <h2
              id="kompas-content-title"
              className="text-forest mb-4 font-serif text-[24px] font-normal"
            >
              {isArea ? "Objavljeni sadržaji" : "Sadržaji uz ovu temu"}
            </h2>

            {contentCards.length > 0 ? (
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-2.5">
                {contentCards.map((card) => (
                  <CompassContentCard key={card.itemKey} card={card} />
                ))}
              </div>
            ) : (
              <div className="border-coffee/20 bg-coffee/3 rounded-[18px] border border-dashed p-[22px]">
                <p className="text-forest mb-2 text-[14.5px]">
                  {isArea
                    ? "Za ovu oblast još nema objavljenih sadržaja."
                    : "Za ovu temu još nema objavljenih sadržaja."}
                </p>
                <p className="text-coffee/60 text-[13px] leading-[1.6]">
                  {isArea
                    ? "Prikazuju se čim budu objavljeni u registru. U međuvremenu pogledajte srodne oblasti ili zatražite stručnu podršku."
                    : "Pogledajte druge teme u oblasti ili zatražite stručnu podršku."}
                </p>
              </div>
            )}
          </section>

          <section className="bg-surface/60 border-line mt-3 flex flex-wrap items-center gap-2.5 rounded-[22px] border p-5">
            <span className="text-coffee/68 w-full text-[11px] tracking-[0.14em] uppercase">
              {isArea ? "Srodne oblasti" : "Druge teme u oblasti"}
            </span>

            {related.map((item) => (
              <Link
                key={item.stableId}
                href={item.canonicalPath as Route}
                className="border-coffee/12 bg-surface text-forest hover:border-coffee/30 inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px] transition-colors"
              >
                {item.publicLabel}
              </Link>
            ))}

            {parent ? (
              <Link
                href={parent.canonicalPath as Route}
                className="border-coffee/12 bg-surface text-forest hover:border-coffee/30 inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px] transition-colors"
              >
                Cela oblast: {parent.publicLabel}
              </Link>
            ) : null}

            <Link
              href={(isArea ? "/kompas/oblasti" : "/kompas/teme") as Route}
              className="text-forest hover:text-forest-soft inline-flex min-h-11 items-center px-2 text-[13.5px] underline underline-offset-[3px]"
            >
              {isArea ? "Sve oblasti" : "Sve teme"}
            </Link>

            <Link
              href="/pronadji-podrsku"
              className="border-forest text-forest hover:bg-meadow/30 ml-auto inline-flex min-h-[46px] items-center rounded-full border px-[18px] text-[13.5px] transition-colors"
            >
              Želim stručnu pomoć
            </Link>
          </section>
        </div>
      </section>
    </>
  );
}
