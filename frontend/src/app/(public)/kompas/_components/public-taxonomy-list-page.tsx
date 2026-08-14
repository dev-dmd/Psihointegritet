import { PublicLink as Link } from "@/components/ui/public-link";

import { JsonLd } from "@/components/shared/json-ld";
import { CompassStartQuestionsButton } from "@/features/compass/sections/compass-start-questions-button";
import {
  compassBreadcrumbJsonLd,
  compassListDiscoverability,
} from "@/lib/compass/discoverability";
import type {
  CompassRouteKind,
  RoutablePublicTaxonomyTerm,
} from "@/lib/compass/types";

import { AreaCard } from "./area-card";
import { CompassPageHero } from "./compass-page-hero";
import { TopicSearchList, type TopicSearchItem } from "./topic-search-list";

interface PublicTaxonomyListPageProps {
  routeKind: CompassRouteKind;
  terms: readonly RoutablePublicTaxonomyTerm[];
  areas?: readonly RoutablePublicTaxonomyTerm[];
  topics?: readonly RoutablePublicTaxonomyTerm[];
}

/**
 * `/kompas/oblasti` and `/kompas/teme`.
 *
 * Both lists share the hero card and the container, and diverge only in what
 * fills the grid: areas are static cards the server can render, topics need the
 * local search island. Content counts are `null` throughout — no public
 * endpoint returns content per taxonomy term yet, and a hardcoded „0 sadržaja"
 * would read as a claim about the registry rather than about what is wired up.
 */
export function PublicTaxonomyListPage({
  routeKind,
  terms,
  areas = [],
  topics = [],
}: PublicTaxonomyListPageProps) {
  const record = compassListDiscoverability(routeKind);
  const isAreaList = routeKind === "oblast";

  const parents = new Map(areas.map((area) => [area.stableId, area]));
  const topicItems: TopicSearchItem[] = terms.map((term) => {
    const parent = term.parentStableId
      ? parents.get(term.parentStableId)
      : undefined;
    return {
      term,
      ...(parent
        ? { parentLabel: parent.publicLabel, parentPath: parent.canonicalPath }
        : {}),
    };
  });

  return (
    <>
      <JsonLd data={compassBreadcrumbJsonLd(record)} />

      <section id="vrh" className="scroll-mt-24 pt-6">
        <div className="mx-auto max-w-[1536px] px-5 pb-[72px] md:px-8 md:pb-24">
          {isAreaList ? (
            <>
              <CompassPageHero
                breadcrumbs={record.breadcrumbs}
                eyebrow="Kompas"
                title="Oblasti"
                lead={record.description}
              >
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link
                    href="/kompas/teme"
                    className="border-coffee/18 text-forest hover:border-coffee/35 inline-flex min-h-[46px] items-center rounded-full border px-5 text-[14px] transition-colors"
                  >
                    Pogledaj sve teme
                  </Link>
                  <CompassStartQuestionsButton
                    label="Pokreni Kompas"
                    className="mt-0"
                  />
                </div>
              </CompassPageHero>

              {terms.length ? (
                <div className="mt-3 grid [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-2.5">
                  {terms.map((term, index) => (
                    <AreaCard
                      key={term.stableId}
                      term={term}
                      ordinal={index + 1}
                      contentCount={null}
                      topics={topics.filter(
                        (topic) => topic.parentStableId === term.stableId,
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="bg-meadow/20 text-coffee/72 mt-3 rounded-[20px] px-5 py-6 text-[15px] leading-[1.65]">
                  Trenutno nema objavljenih oblasti.
                </p>
              )}
            </>
          ) : (
            <TopicSearchList
              breadcrumbs={record.breadcrumbs}
              lead={record.description}
              items={topicItems}
            />
          )}

          <section className="bg-forest text-canvas mt-3 rounded-[26px] px-6 py-8 md:flex md:items-center md:justify-between md:gap-10 md:px-10">
            <div className="max-w-[620px]">
              <h2 className="font-serif text-[30px] leading-tight font-normal">
                Potreban vam je sledeći korak?
              </h2>
              <p className="text-canvas/75 mt-3 text-[15px] leading-[1.65]">
                Možete nastaviti ka izboru stručne podrške bez obzira na to gde
                ste završili istraživanje.
              </p>
            </div>
            <Link
              href="/pronadji-podrsku"
              className="bg-canvas text-forest hover:bg-meadow mt-6 inline-flex min-h-12 shrink-0 items-center rounded-full px-6 text-[15px] font-semibold transition-colors md:mt-0"
            >
              Pronađite podršku
            </Link>
          </section>
        </div>
      </section>
    </>
  );
}
