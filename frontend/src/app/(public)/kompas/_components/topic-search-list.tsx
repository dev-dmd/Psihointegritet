"use client";

import { useDeferredValue, useId, useState } from "react";
import { useTranslations } from "next-intl";

import { countSr } from "@/helpers/plural-sr";
import type { CompassBreadcrumb } from "@/lib/compass/discoverability";
import type { RoutablePublicTaxonomyTerm } from "@/lib/compass/types";

import { CompassPageHero } from "./compass-page-hero";
import { TopicCard } from "./topic-card";

export interface TopicSearchItem {
  term: RoutablePublicTaxonomyTerm;
  parentLabel?: string;
  parentPath?: string;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("sr-Latn");
}

/**
 * `/kompas/teme` — hero, search and results in one island.
 *
 * The search field lives inside the hero while the results live below it, so
 * both sit under the same state. Filtering is local over the already-loaded
 * public set — the design's own note — which is why there is no request per
 * keystroke and no debounce; `useDeferredValue` keeps typing responsive while
 * the list re-renders.
 *
 * The query deliberately never reaches the URL: a Kompas topic someone searched
 * for is exactly the kind of thing that must not end up in a shared link, a
 * browser history entry or a referrer header.
 */
export function TopicSearchList({
  breadcrumbs,
  lead,
  items,
}: {
  breadcrumbs: readonly CompassBreadcrumb[];
  lead: string;
  items: readonly TopicSearchItem[];
}) {
  const t = useTranslations("public.compass.lists");
  const inputId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const needle = normalized(deferredQuery);
  const filtered = needle
    ? items.filter(({ term, parentLabel }) =>
        [
          term.publicLabel,
          term.shortDescription,
          parentLabel ?? "",
          ...term.searchTerms,
        ].some((value) => normalized(value).includes(needle)),
      )
    : items;

  return (
    <>
      <CompassPageHero
        breadcrumbs={breadcrumbs}
        eyebrow={t("compass")}
        title={t("topics")}
        lead={lead}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <label htmlFor={inputId} className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="border-coffee/16 bg-surface text-coffee placeholder:text-coffee/45 focus:border-sage focus:ring-sage/25 min-h-12 min-w-[200px] flex-[1_1_240px] rounded-full border px-[18px] text-[14.5px] outline-none focus:ring-4"
          />
          <button
            type="button"
            onClick={() => setQuery("")}
            disabled={query === ""}
            className="border-coffee/14 text-forest hover:border-coffee/35 disabled:text-coffee/35 min-h-12 cursor-pointer rounded-full border px-[18px] text-[13.5px] transition-colors disabled:cursor-not-allowed"
          >
            {t("clear")}
          </button>
          <span aria-live="polite" className="text-coffee/68 text-[12.5px]">
            {filtered.length === items.length
              ? countSr(items.length, "tema", "teme", "tema")
              : `${filtered.length} od ${countSr(items.length, "teme", "teme", "tema")}`}
          </span>
        </div>
      </CompassPageHero>

      <div className="mt-3 grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-2">
        {filtered.map(({ term, parentLabel, parentPath }) => (
          <TopicCard
            key={term.stableId}
            term={term}
            contentCount={null}
            {...(parentLabel ? { parentLabel } : {})}
            {...(parentPath ? { parentPath } : {})}
          />
        ))}

        {filtered.length === 0 ? (
          <div className="border-coffee/20 bg-surface/60 col-span-full rounded-[18px] border border-dashed px-5 py-[26px] text-center">
            <p className="text-forest mb-3 text-[14.5px]">
              {items.length === 0 ? t("noTopics") : t("noResults")}
            </p>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="border-coffee/16 text-forest hover:border-coffee/35 min-h-11 cursor-pointer rounded-full border px-[18px] text-[13.5px] transition-colors"
              >
                {t("showAll")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
