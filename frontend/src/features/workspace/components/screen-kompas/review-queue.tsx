"use client";

import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";

import type { TaxonomyIntakeLink, TaxonomyTerm } from "../../taxonomy-api";
import { sortTerms } from "./helpers";
import { IntakeLinkCards } from "./intake-link-cards";
import { TermCard } from "./term-card";

export function ReviewQueue({
  terms,
  links,
  onTermChanged,
  onLinkChanged,
}: {
  terms: TaxonomyTerm[];
  links: TaxonomyIntakeLink[];
  onTermChanged: (term: TaxonomyTerm) => void;
  onLinkChanged: (link: TaxonomyIntakeLink) => void;
}) {
  const reviewTerms = sortTerms(
    terms.filter(
      (term) =>
        !term.systemDefined &&
        (term.status === "in_review" || term.status === "approved"),
    ),
  );
  const reviewLinks = links.filter(
    (link) => link.status === "in_review" || link.status === "approved",
  );

  return (
    <div role="tabpanel" aria-label="Pregled i odobrenja">
      <div className="mb-4">
        <h2 className="text-forest font-serif text-[22px]">
          Pregled i odobrenja
        </h2>
        <p className="text-ink-55 mt-1 max-w-[760px] text-[13.5px] leading-[1.5]">
          Zajednički pregled stavki koje čekaju stručnu ili poslovnu odluku i
          odobrenih stavki spremnih za objavu.
        </p>
      </div>
      {reviewTerms.length === 0 && reviewLinks.length === 0 ? (
        <EmptyDashedCard title="Nema stavki koje čekaju odluku">
          Radne verzije će se pojaviti ovde nakon slanja na pregled.
        </EmptyDashedCard>
      ) : (
        <div className="space-y-5">
          {reviewTerms.length > 0 ? (
            <section>
              <h3 className="text-ink-70 mb-2 text-[12px] font-semibold tracking-[0.12em] uppercase">
                Registar · {reviewTerms.length}
              </h3>
              <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
                {reviewTerms.map((term) => (
                  <TermCard
                    key={term.revisionId}
                    term={term}
                    registryTerms={terms}
                    onChanged={onTermChanged}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {reviewLinks.length > 0 ? (
            <section>
              <h3 className="text-ink-70 mb-2 text-[12px] font-semibold tracking-[0.12em] uppercase">
                Povezivanja · {reviewLinks.length}
              </h3>
              <IntakeLinkCards links={reviewLinks} onChanged={onLinkChanged} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
