import { PublicLink as Link } from "@/components/ui/public-link";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import type { Therapist } from "@/types/therapist";

/**
 * Stručna podrška — the evergreen professional-support block that closes every
 * Kompas detail page (/kompas/oblast/[slug] and /kompas/tema/[slug]).
 *
 * Server Component. Reads the therapist registry directly — no hook needed
 * because this data does not change per user session. The block is identical
 * on every Kompas detail route by design: Kompas does not rank or filter
 * therapists, so all three personal-access-path cards are always shown.
 */

const COPY = {
  label: "Stručna podrška",
  heading: "Kada poželite razgovor",
  lead: "Kompas ne bira terapeuta umesto vas. Ako želite, prenosimo samo ono što ste izabrali u obrazac za pronalaženje podrške — i pre toga vam pokažemo šta se tačno prenosi.",
  ctaPrimary: "Želim stručnu pomoć",
  ctaSecondary: "Završi istraživanje",
  transferNote:
    "Kontekst je prenet u Pronađi podršku. Tamo možete da ga izmenite ili uklonite pre nego što nastavite.",
} as const;

export function CompassSupportSection({
  therapists,
}: {
  therapists: readonly Therapist[];
}) {
  return (
    <section
      aria-labelledby="kompas-support-title"
      className="bg-forest mt-3 rounded-[22px] px-5 py-[22px] md:px-8 md:py-7"
    >
      <p className="text-meadow/80 mb-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
        {COPY.label}
      </p>

      <h2
        id="kompas-support-title"
        className="text-canvas font-serif text-[24px] leading-[1.2] font-normal"
      >
        {COPY.heading}
      </h2>

      <p className="text-canvas/78 mt-2.5 max-w-[60ch] text-[14px] leading-[1.7]">
        {COPY.lead}
      </p>

      {/* Therapist cards — stacked on mobile, side-by-side on desktop */}
      <div className="mt-[18px] grid grid-cols-1 gap-2 md:grid-cols-3">
        {therapists.map((therapist) => (
          <Link
            key={therapist.slug}
            href={`/tim/${therapist.slug}`}
            className="border-meadow/22 hover:border-meadow/40 flex items-center gap-3 rounded-[16px] border p-[14px] transition-colors"
          >
            <MonogramAvatar
              initials={therapist.initials}
              name={therapist.name}
              imageSrc={therapist.image}
              size="sm"
              className="border-meadow/50 bg-meadow/24 text-canvas h-[42px] w-[42px] text-[13px]"
            />

            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-canvas truncate text-[14.5px] leading-snug">
                {therapist.name}
              </span>
              <span className="text-canvas/68 text-[12px] leading-[1.45]">
                {therapist.title}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA row — full-width on mobile, natural width on desktop */}
      <div className="mt-[18px] flex gap-2.5">
        <Link
          href="/pronadji-podrsku"
          className="bg-meadow text-kompas-on-meadow hover:bg-meadow-hover flex flex-1 items-center justify-center rounded-full px-2 py-2.5 text-[11px] font-semibold transition-colors md:flex-initial md:justify-start md:px-5 md:text-[14px]"
        >
          {COPY.ctaPrimary}
        </Link>

        <Link
          href="/kompas"
          className="border-meadow/35 text-canvas hover:border-meadow/55 flex flex-1 items-center justify-center rounded-full border bg-transparent px-3 py-2.5 text-[11px] transition-colors md:flex-initial md:justify-start md:px-5 md:text-[14px]"
        >
          {COPY.ctaSecondary}
        </Link>
      </div>

      {/* Context transfer note */}
      <p className="bg-meadow/16 text-canvas mt-4 rounded-[12px] px-[14px] py-3 text-[13px] leading-[1.6]">
        {COPY.transferNote}
      </p>
    </section>
  );
}
