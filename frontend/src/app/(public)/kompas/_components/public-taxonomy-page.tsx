import type { Route } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/shared/json-ld";
import { PageHero } from "@/components/shared/page-hero";
import { ArrowLink } from "@/components/ui/arrow-link";
import { ButtonLink } from "@/components/ui/button-link";
import { Eyebrow } from "@/components/ui/eyebrow";
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

import { CompassBreadcrumbs } from "./breadcrumbs";
import { TaxonomyLinkCard } from "./taxonomy-link-card";

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

export function PublicTaxonomyPage({
  aggregate,
  routeKind,
}: PublicTaxonomyPageProps) {
  const record = compassPageDiscoverability(aggregate, routeKind);
  const term = routablePublicTerm(aggregate.term, routeKind);
  if (!term) throw new Error("Compass page received a non-routable term.");

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

  return (
    <>
      <JsonLd data={compassBreadcrumbJsonLd(record)} />
      <PageHero id={routeKind === "oblast" ? "oblast" : "tema"}>
        <CompassBreadcrumbs items={record.breadcrumbs} />
        <div className="max-w-[780px]">
          <Eyebrow className="mb-4">
            Kompas · {routeKind === "oblast" ? "Oblast" : "Tema"}
          </Eyebrow>
          <h1 className="text-forest mb-5 font-serif text-[clamp(34px,8.5vw,56px)] leading-[1.04] font-normal tracking-[-0.015em] text-pretty">
            {term.publicLabel}
          </h1>
          {term.shortDescription ? (
            <p className="text-coffee/75 max-w-[700px] text-[17px] leading-[1.7]">
              {term.shortDescription}
            </p>
          ) : null}
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1120px] px-5 py-[64px] md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,8fr)_minmax(280px,4fr)]">
          <div className="space-y-16">
            {children.length ? (
              <section aria-labelledby="kompas-children-title">
                <Eyebrow className="mb-4">Objavljene teme</Eyebrow>
                <h2
                  id="kompas-children-title"
                  className="text-forest font-serif text-[clamp(30px,7vw,44px)] leading-tight font-normal"
                >
                  Teme u ovoj oblasti
                </h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {children.map((child) => (
                    <TaxonomyLinkCard key={child.stableId} term={child} />
                  ))}
                </div>
              </section>
            ) : null}

            {contentCards.length ? (
              <section aria-labelledby="kompas-content-title">
                <Eyebrow className="mb-4">Dostupno za čitanje</Eyebrow>
                <h2
                  id="kompas-content-title"
                  className="text-forest font-serif text-[clamp(30px,7vw,44px)] leading-tight font-normal"
                >
                  Povezani sadržaji
                </h2>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {contentCards.map((card) => (
                    <article
                      key={card.itemKey}
                      className="bg-meadow/20 flex h-full flex-col rounded-[22px] p-6"
                    >
                      <p className="text-sage text-[12px] font-semibold tracking-[0.12em] uppercase">
                        {card.accessLevel === "public" ? "Javno dostupno" : ""}
                      </p>
                      <h3 className="text-forest mt-2 font-serif text-[25px] leading-tight font-normal">
                        {card.title}
                      </h3>
                      {card.description ? (
                        <p className="text-coffee/72 mt-3 flex-1 text-[14.5px] leading-[1.65]">
                          {card.description}
                        </p>
                      ) : (
                        <div className="flex-1" />
                      )}
                      <ArrowLink href={card.href} className="mt-6">
                        Pogledajte sadržaj
                      </ArrowLink>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {related.length ? (
              <section aria-labelledby="kompas-related-title">
                <Eyebrow className="mb-4">Nastavite istraživanje</Eyebrow>
                <h2
                  id="kompas-related-title"
                  className="text-forest font-serif text-[clamp(30px,7vw,44px)] leading-tight font-normal"
                >
                  Povezane teme
                </h2>
                <ul className="border-coffee/10 mt-6 divide-y border-y">
                  {related.map((item) => (
                    <li key={item.stableId}>
                      <Link
                        href={item.canonicalPath as Route}
                        className="text-forest hover:text-sage flex min-h-14 items-center justify-between gap-4 py-3 font-semibold transition-colors"
                      >
                        <span>{item.publicLabel}</span>
                        <span aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {!children.length && !contentCards.length && !related.length ? (
              <p className="bg-meadow/20 text-coffee/72 rounded-[20px] px-5 py-6 text-[15px] leading-[1.65]">
                Za ovu temu trenutno nema dodatnih objavljenih sadržaja.
              </p>
            ) : null}
          </div>

          <aside className="space-y-5">
            {parent ? (
              <section className="border-coffee/10 bg-surface rounded-[22px] border p-6">
                <p className="text-coffee/55 text-[12px] font-semibold tracking-[0.12em] uppercase">
                  Pripada oblasti
                </p>
                <ArrowLink href={parent.canonicalPath} className="mt-3">
                  {parent.publicLabel}
                </ArrowLink>
              </section>
            ) : null}

            <section className="bg-forest text-canvas rounded-[22px] p-6">
              <h2 className="font-serif text-[27px] leading-tight font-normal">
                Želite stručnu pomoć?
              </h2>
              <p className="text-canvas/75 mt-3 text-[14.5px] leading-[1.65]">
                Nastavite ka izboru podrške i proverite koji sledeći korak vam
                odgovara.
              </p>
              <ButtonLink
                href="/pronadji-podrsku"
                variant="light"
                className="mt-6"
              >
                Pronađite podršku
              </ButtonLink>
            </section>

            <Link
              href={
                (routeKind === "oblast"
                  ? "/kompas/oblasti"
                  : "/kompas/teme") as Route
              }
              className="text-forest hover:text-sage inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >
              {routeKind === "oblast"
                ? "Sve objavljene oblasti"
                : "Sve objavljene teme"}
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
