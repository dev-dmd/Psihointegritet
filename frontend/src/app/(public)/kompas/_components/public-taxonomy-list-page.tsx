import { JsonLd } from "@/components/shared/json-ld";
import { PageHero } from "@/components/shared/page-hero";
import { ButtonLink } from "@/components/ui/button-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  compassBreadcrumbJsonLd,
  compassListDiscoverability,
} from "@/lib/compass/discoverability";
import type {
  CompassRouteKind,
  RoutablePublicTaxonomyTerm,
} from "@/lib/compass/types";

import { CompassBreadcrumbs } from "./breadcrumbs";
import { TaxonomyLinkCard } from "./taxonomy-link-card";
import { TopicSearchList } from "./topic-search-list";

interface PublicTaxonomyListPageProps {
  routeKind: CompassRouteKind;
  terms: readonly RoutablePublicTaxonomyTerm[];
  areas?: readonly RoutablePublicTaxonomyTerm[];
}

export function PublicTaxonomyListPage({
  routeKind,
  terms,
  areas = [],
}: PublicTaxonomyListPageProps) {
  const record = compassListDiscoverability(routeKind);
  const isAreaList = routeKind === "oblast";
  const parentLabels = new Map(
    areas.map((area) => [area.stableId, area.publicLabel]),
  );
  const topicItems = terms.map((term) => {
    const parentLabel = term.parentStableId
      ? parentLabels.get(term.parentStableId)
      : undefined;
    return parentLabel ? { term, parentLabel } : { term };
  });

  return (
    <>
      <JsonLd data={compassBreadcrumbJsonLd(record)} />
      <PageHero id={isAreaList ? "oblasti" : "teme"} tone="meadow">
        <CompassBreadcrumbs items={record.breadcrumbs} />
        <div className="max-w-[780px]">
          <Eyebrow className="mb-4">Kompas</Eyebrow>
          <h1 className="text-forest mb-5 font-serif text-[clamp(34px,8.5vw,56px)] leading-[1.04] font-normal tracking-[-0.015em] text-pretty">
            {isAreaList ? "Oblasti" : "Teme"}
          </h1>
          <p className="text-coffee/75 max-w-[700px] text-[17px] leading-[1.7]">
            {record.description}
          </p>
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1120px] px-5 py-[64px] md:px-8 md:py-24">
        {terms.length ? (
          isAreaList ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {terms.map((term) => (
                <TaxonomyLinkCard key={term.stableId} term={term} />
              ))}
            </div>
          ) : (
            <TopicSearchList items={topicItems} />
          )
        ) : (
          <p className="bg-meadow/20 text-coffee/72 rounded-[20px] px-5 py-6 text-[15px] leading-[1.65]">
            Trenutno nema objavljenih {isAreaList ? "oblasti" : "tema"}.
          </p>
        )}

        <section className="bg-forest text-canvas mt-16 rounded-[26px] px-6 py-8 md:flex md:items-center md:justify-between md:gap-10 md:px-10">
          <div className="max-w-[620px]">
            <h2 className="font-serif text-[30px] leading-tight font-normal">
              Potreban vam je sledeći korak?
            </h2>
            <p className="text-canvas/75 mt-3 text-[15px] leading-[1.65]">
              Možete nastaviti ka izboru stručne podrške bez obzira na to gde
              ste završili istraživanje.
            </p>
          </div>
          <ButtonLink
            href="/pronadji-podrsku"
            variant="light"
            className="mt-6 shrink-0 md:mt-0"
          >
            Pronađite podršku
          </ButtonLink>
        </section>
      </div>
    </>
  );
}
