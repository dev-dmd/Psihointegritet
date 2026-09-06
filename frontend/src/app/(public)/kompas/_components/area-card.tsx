import type { Route } from "next";
import { PublicLink as Link } from "@/components/ui/public-link";
import { useLocale, useTranslations } from "next-intl";

import { countSr } from "@/helpers/plural-sr";
import type { RoutablePublicTaxonomyTerm } from "@/lib/compass/types";

/**
 * One area on `/kompas/oblasti`.
 *
 * The ordinal is decorative and `aria-hidden`: it is the registry's declared
 * `sortOrder` position, not a ranking, and reading „01" out before every title
 * would imply an importance the design explicitly denies in the page lead.
 *
 * The topic chips are real links, so an area with three visible topics offers
 * four ways in rather than one.
 */
export function AreaCard({
  term,
  ordinal,
  topics,
  contentCount,
}: {
  term: RoutablePublicTaxonomyTerm;
  ordinal: number;
  topics: readonly RoutablePublicTaxonomyTerm[];
  contentCount: number | null;
}) {
  const locale = useLocale();
  const t = useTranslations("public.compass.lists");
  const meta = [
    locale === "sr-Latn"
      ? countSr(topics.length, "tema", "teme", "tema")
      : `${topics.length} ${topics.length === 1 ? "topic" : "topics"}`,
    contentCount === null
      ? t("contentPreparingLower")
      : locale === "sr-Latn"
        ? countSr(contentCount, "sadržaj", "sadržaja", "sadržaja")
        : `${contentCount} ${contentCount === 1 ? "item" : "items"}`,
  ].join(" · ");

  return (
    <article className="bg-surface hover:shadow-card-hover flex flex-col gap-3 rounded-[20px] p-5 transition-shadow">
      <div className="flex items-center justify-between">
        <span aria-hidden className="text-sage font-serif text-[13px] italic">
          {String(ordinal).padStart(2, "0")}
        </span>
        <Link
          href={term.canonicalPath as Route}
          aria-label={t("openArea", { name: term.publicLabel })}
          className="border-coffee/14 text-forest hover:border-forest hover:bg-meadow/30 grid h-[34px] w-[34px] place-items-center rounded-full border text-[13px] transition-colors"
        >
          <span aria-hidden>→</span>
        </Link>
      </div>

      <h2 className="font-serif text-[23px] leading-[1.2] font-normal">
        <Link
          href={term.canonicalPath as Route}
          className="text-forest hover:text-forest-soft"
        >
          {term.publicLabel}
        </Link>
      </h2>

      {term.shortDescription ? (
        <p className="text-coffee/65 text-[13.5px] leading-[1.6]">
          {term.shortDescription}
        </p>
      ) : null}

      {topics.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {topics.slice(0, 3).map((topic) => (
            <li key={topic.stableId}>
              <Link
                href={topic.canonicalPath as Route}
                className="border-coffee/12 text-coffee/75 hover:border-coffee/30 hover:text-forest inline-flex rounded-full border px-3 py-1.5 text-[12px] transition-colors"
              >
                {topic.publicLabel}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="border-coffee/7 text-sage mt-auto border-t pt-2.5 text-[11.5px] tracking-[0.06em] uppercase">
        {meta}
      </p>
    </article>
  );
}
