import { PublicLink as Link } from "@/components/ui/public-link";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("public.compass.lists");
  const record = compassListDiscoverability(routeKind);
  const isAreaList = routeKind === "oblast";
  const localizedRecord = {
    ...record,
    description: t(isAreaList ? "areasLead" : "topicsLead"),
    breadcrumbs: [
      { label: t("home"), path: "/" },
      {
        label: t(isAreaList ? "areas" : "topics"),
        path: isAreaList ? "/kompas/oblasti" : "/kompas/teme",
      },
    ],
  };

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
      <JsonLd data={compassBreadcrumbJsonLd(localizedRecord)} />

      <section id="vrh" className="scroll-mt-24 pt-6">
        <div className="mx-auto max-w-[1536px] px-5 pb-[72px] md:px-8 md:pb-24">
          {isAreaList ? (
            <>
              <CompassPageHero
                breadcrumbs={localizedRecord.breadcrumbs}
                eyebrow={t("compass")}
                title={t("areas")}
                lead={localizedRecord.description}
              >
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link
                    href="/kompas/teme"
                    className="border-coffee/18 text-forest hover:border-coffee/35 inline-flex min-h-[46px] items-center rounded-full border px-5 text-[14px] transition-colors"
                  >
                    {t("viewTopics")}
                  </Link>
                  <CompassStartQuestionsButton
                    label={t("start")}
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
                  {t("noAreas")}
                </p>
              )}
            </>
          ) : (
            <TopicSearchList
              breadcrumbs={localizedRecord.breadcrumbs}
              lead={localizedRecord.description}
              items={topicItems}
            />
          )}

          <section className="bg-forest text-canvas mt-3 rounded-[26px] px-6 py-8 md:flex md:items-center md:justify-between md:gap-10 md:px-10">
            <div className="max-w-[620px]">
              <h2 className="font-serif text-[30px] leading-tight font-normal">
                {t("nextTitle")}
              </h2>
              <p className="text-canvas/75 mt-3 text-[15px] leading-[1.65]">
                {t("nextBody")}
              </p>
            </div>
            <Link
              href="/pronadji-podrsku"
              className="bg-canvas text-forest hover:bg-meadow mt-6 inline-flex min-h-12 shrink-0 items-center rounded-full px-6 text-[15px] font-semibold transition-colors md:mt-0"
            >
              {t("findSupport")}
            </Link>
          </section>
        </div>
      </section>
    </>
  );
}
