import { ArrowLink } from "@/components/ui/arrow-link";
import type { RoutablePublicTaxonomyTerm } from "@/lib/compass/types";

interface TaxonomyLinkCardProps {
  term: RoutablePublicTaxonomyTerm;
  parentLabel?: string;
}

export function TaxonomyLinkCard({ term, parentLabel }: TaxonomyLinkCardProps) {
  return (
    <article className="border-coffee/10 bg-surface flex h-full flex-col rounded-[22px] border p-6">
      {parentLabel ? (
        <p className="text-sage mb-2 text-[12px] font-semibold tracking-[0.12em] uppercase">
          {parentLabel}
        </p>
      ) : null}
      <h2 className="text-forest font-serif text-[26px] leading-tight font-normal">
        {term.publicLabel}
      </h2>
      {term.shortDescription ? (
        <p className="text-coffee/72 mt-3 flex-1 text-[14.5px] leading-[1.65]">
          {term.shortDescription}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <ArrowLink href={term.canonicalPath} className="mt-6">
        {term.axis === "topic_group" ? "Pogledajte oblast" : "Istražite temu"}
      </ArrowLink>
    </article>
  );
}
