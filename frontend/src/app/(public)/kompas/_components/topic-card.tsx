import type { Route } from "next";
import Link from "next/link";

import { countSr } from "@/helpers/plural-sr";
import type { RoutablePublicTaxonomyTerm } from "@/lib/compass/types";

/**
 * One topic on `/kompas/teme`.
 *
 * The area chip is its own link rather than a label: someone who recognises the
 * area but not the topic wording should be able to widen the search in one
 * click instead of going back.
 */
export function TopicCard({
  term,
  parentLabel,
  parentPath,
  contentCount,
}: {
  term: RoutablePublicTaxonomyTerm;
  parentLabel?: string;
  parentPath?: string;
  contentCount: number | null;
}) {
  return (
    <article className="bg-surface hover:shadow-card-hover flex flex-col gap-2 rounded-[18px] p-[18px] transition-shadow">
      {parentLabel ? (
        parentPath ? (
          <Link
            href={parentPath as Route}
            className="bg-meadow/30 text-forest hover:bg-meadow/50 self-start rounded-full px-2.5 py-1 text-[11px] tracking-[0.06em] uppercase transition-colors"
          >
            {parentLabel}
          </Link>
        ) : (
          <span className="bg-meadow/30 text-forest self-start rounded-full px-2.5 py-1 text-[11px] tracking-[0.06em] uppercase">
            {parentLabel}
          </span>
        )
      ) : null}

      <h2 className="font-serif text-[20px] leading-[1.25] font-normal">
        <Link
          href={term.canonicalPath as Route}
          className="text-forest hover:text-forest-soft"
        >
          {term.publicLabel}
        </Link>
      </h2>

      <span className="text-coffee/65 mt-auto text-[12px]">
        {contentCount === null
          ? "Sadržaji u pripremi"
          : countSr(contentCount, "sadržaj", "sadržaja", "sadržaja")}
      </span>
    </article>
  );
}
