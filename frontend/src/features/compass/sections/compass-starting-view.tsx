import type { Route } from "next";
import { PublicLink as Link } from "@/components/ui/public-link";

import type { RoutablePublicTaxonomyTerm } from "@/lib/compass/types";

import { CompassStartQuestionsButton } from "./compass-start-questions-button";

/**
 * „Polazni prikaz" — the package of areas and topics shown by default.
 *
 * This is what a visitor gets without answering anything: the same view the
 * sheet falls back to when the answer is „Nisam siguran/na šta mi se događa" or
 * the flow is abandoned. That makes every area and topic here a **link**, not
 * decoration — landing on `/kompas` directly has to lead somewhere, otherwise
 * the page is a dead end for exactly the people least able to phrase a query.
 *
 * Reads the registry resolved by the server (published API, otherwise the
 * checked-in fallback). The content section renders its designed empty state:
 * no public endpoint returns content filtered by taxonomy term yet, so nothing
 * is fabricated to fill the grid.
 */
export function CompassStartingView({
  areas,
  topics,
  isDemo = false,
  id,
}: {
  areas: readonly RoutablePublicTaxonomyTerm[];
  topics: readonly RoutablePublicTaxonomyTerm[];
  isDemo?: boolean;
  id: string;
}) {
  const visibleTopics = topics.slice(0, 12);

  return (
    <div className="mx-auto max-w-[1536px] px-5 pt-3 pb-[72px] md:px-8 md:pb-24">
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="bg-meadow/28 scroll-mt-24 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
      >
        <h2
          id={`${id}-title`}
          className="text-forest font-serif text-[22px] leading-[1.15] font-normal md:text-[32px]"
        >
          Polazni prikaz
        </h2>
        <p className="text-coffee/78 mt-2.5 max-w-[60ch] text-[14.5px] leading-[1.7] text-pretty">
          Bez odgovora na pitanja, ovde su sve oblasti i teme koje trenutno
          postoje na platformi. Krenite od onoga što vam zvuči najbliže —
          pitanja možete pokrenuti kad god poželite.
        </p>
        <CompassStartQuestionsButton />
        {isDemo ? (
          <p className="border-honey/40 bg-honey/10 text-coffee mt-4 rounded-xl border px-3 py-2 text-[12.5px]">
            Demo sadržaj — prikazan je samo u lokalnom preview režimu.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="kompas-polazni-oblasti"
        className="bg-surface mt-3 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
      >
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2
            id="kompas-polazni-oblasti"
            className="text-forest font-serif text-[24px] font-normal"
          >
            Oblasti
          </h2>
          <Link
            href="/kompas/oblasti"
            className="text-forest hover:text-forest-soft ml-auto text-[13.5px] underline underline-offset-[3px]"
          >
            Sve oblasti →
          </Link>
        </div>

        <div className="mt-4 grid [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))] gap-2">
          {areas.map((area) => (
            <Link
              key={area.stableId}
              href={area.canonicalPath as Route}
              className="border-line bg-surface hover:border-coffee/25 hover:shadow-card-hover flex flex-col gap-1 rounded-[14px] border px-4 py-3.5 transition-[border-color,box-shadow]"
            >
              <span className="text-forest text-[15px]">
                {area.publicLabel}
              </span>
              <span className="text-coffee/60 text-[12.5px] leading-[1.5]">
                {area.shortDescription}
              </span>
              <span className="text-sage text-[11px] tracking-[0.06em] uppercase">
                {
                  topics.filter(
                    (topic) => topic.parentStableId === area.stableId,
                  ).length
                }{" "}
                tema
              </span>
            </Link>
          ))}
        </div>
      </section>

      {visibleTopics.length > 0 ? (
        <section
          aria-labelledby="kompas-polazni-teme"
          className="bg-surface mt-3 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
        >
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2
              id="kompas-polazni-teme"
              className="text-forest font-serif text-[24px] font-normal"
            >
              Aktuelne teme
            </h2>
            <Link
              href="/kompas/teme"
              className="text-forest hover:text-forest-soft ml-auto text-[13.5px] underline underline-offset-[3px]"
            >
              Sve teme →
            </Link>
          </div>

          <ul className="mt-4 flex flex-wrap gap-2">
            {visibleTopics.map((topic) => (
              <li key={topic.stableId}>
                <Link
                  href={topic.canonicalPath as Route}
                  className="border-line-strong bg-coffee/3 text-forest hover:border-coffee/30 inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px] transition-colors"
                >
                  {topic.publicLabel}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="kompas-polazni-sadrzaj"
        className="bg-surface mt-3 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
      >
        <h2
          id="kompas-polazni-sadrzaj"
          className="text-forest mb-1 font-serif text-[24px] font-normal"
        >
          Dostupno bez odgovora na pitanja
        </h2>
        <p className="text-coffee/60 mb-4 text-[13.5px]">
          Javno objavljeni sadržaji, poređani redosledom iz registra.
        </p>
        <div className="border-line-strong rounded-[18px] border border-dashed px-6 py-10 text-center">
          <p className="text-coffee text-[14.5px] font-semibold">
            Još nema objavljenih sadržaja
          </p>
          <p className="text-coffee/70 mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-[1.6]">
            Sadržaji se prikazuju čim budu objavljeni i povezani sa oblastima u
            registru.
          </p>
        </div>
      </section>
    </div>
  );
}
