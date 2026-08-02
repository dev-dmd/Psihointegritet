import { SectionHeading } from "@/components/ui/section-heading";

import { allFallbackTopics, type CompassRegistry } from "../fallback-registry";

/**
 * „Polazni prikaz" — what a visitor sees before answering anything.
 *
 * Reads the registry resolved by the server (published API, otherwise the
 * checked-in fallback). Content sections render their designed empty state: no
 * public endpoint returns content filtered by taxonomy term yet, so nothing is
 * fabricated to fill the grid.
 */
export function CompassStartingView({
  registry,
  id,
}: {
  registry: CompassRegistry;
  id: string;
}) {
  const topics = allFallbackTopics(registry).slice(0, 12);

  return (
    <>
      <section id={id} className="scroll-mt-24 px-5 pt-[72px] md:px-8 md:pt-24">
        <div className="bg-meadow/30 rounded-panel px-6 py-7 md:px-8 md:py-8">
          <p className="text-forest max-w-[62ch] font-serif text-[19px] leading-[1.5] md:text-[21px]">
            Ne morate odmah znati kako da objasnite ono što vam se događa.
          </p>
          <p className="text-coffee/70 mt-3 max-w-[62ch] text-[14px] leading-[1.65]">
            Počnite od oblasti koja vam zvuči najbliže. Uvek možete da se
            vratite i promenite izbor.
          </p>
        </div>
      </section>

      <section className="px-5 pt-[56px] md:px-8 md:pt-20">
        <SectionHeading
          eyebrow="Oblasti"
          title="Od čega želite da počnete?"
          description="Redosled dolazi iz registra i nije rangiranje po važnosti."
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registry.areas.map((area, index) => (
            <article
              key={area.stableId}
              className="rounded-card border-line bg-surface flex flex-col gap-3 border px-6 py-6"
            >
              <div className="text-sage flex items-center justify-between font-serif text-[13px] italic">
                {String(index + 1).padStart(2, "0")}
                <span
                  aria-hidden
                  className="border-line-strong text-forest grid h-7 w-7 place-items-center rounded-full border text-[12px] not-italic"
                >
                  →
                </span>
              </div>

              <h3 className="text-forest font-serif text-[21px] leading-[1.2]">
                {area.label}
              </h3>

              <p className="text-coffee/62 text-[13.5px] leading-[1.55]">
                {area.description}
              </p>

              {area.topics.length > 0 ? (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {area.topics.slice(0, 3).map((topic) => (
                    <li
                      key={topic.stableId}
                      className="border-line-strong text-coffee/70 rounded-full border px-2.5 py-1 text-[11.5px]"
                    >
                      {topic.label}
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="text-ink-45 mt-auto pt-2 text-[11.5px]">
                {area.topics.length} tema
              </p>
            </article>
          ))}
        </div>
      </section>

      {topics.length > 0 ? (
        <section className="px-5 pt-[56px] md:px-8 md:pt-20">
          <SectionHeading
            eyebrow="Teme"
            title="Konkretnije teme"
            description="Uža tema unutar oblasti — korisna kada već znate šta vas najviše zaokuplja."
          />
          <ul className="mt-6 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <li
                key={topic.stableId}
                className="border-line-strong text-coffee/75 rounded-full border px-4 py-2.5 text-[13px]"
              >
                {topic.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="px-5 pt-[56px] pb-[72px] md:px-8 md:pt-20 md:pb-24">
        <SectionHeading
          eyebrow="Sadržaji"
          title="Dostupno bez odgovora na pitanja"
          description="Javno dostupni sadržaji koji ne traže nalog."
        />
        <div className="border-line-strong rounded-panel mt-6 border border-dashed px-6 py-10 text-center">
          <p className="text-coffee text-[14.5px] font-semibold">
            Još nema objavljenih sadržaja
          </p>
          <p className="text-coffee/70 mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-[1.6]">
            Sadržaji se prikazuju čim budu objavljeni i povezani sa oblastima u
            registru.
          </p>
        </div>
      </section>
    </>
  );
}
