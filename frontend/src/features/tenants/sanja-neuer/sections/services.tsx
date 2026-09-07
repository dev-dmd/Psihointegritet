import { cn } from "@/helpers/cn";
import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { services } = sanjaContent;

const FILLS = {
  burgundy: {
    card: "bg-sn-burgundy border-sn-burgundy",
    title: "text-sn-ivory",
    badge: "bg-sn-lilac text-sn-ink",
    body: "text-sn-ivory/82",
    bullet: "text-sn-lilac",
    bulletText: "text-sn-ivory/80",
    cta: "ivory" as const,
  },
  surface: {
    card: "bg-sn-surface border-sn-lilac",
    title: "text-sn-burgundy",
    badge: "bg-sn-lilac/50 text-sn-ink",
    body: "text-sn-ink/75",
    bullet: "text-sn-lilac-deep",
    bulletText: "text-sn-ink/75",
    cta: "lilac" as const,
  },
} as const;

/**
 * Two cards, one filled and one outlined, with their CTAs pinned to the bottom
 * (`mt-auto`) so the buttons line up even though the copy lengths differ.
 *
 * The header row wraps and the title carries `min-w-0`: without both, a long
 * service name and the badge overflow the card instead of stacking, which the
 * handoff flags as the failure to watch at narrow widths.
 */
export function SanjaServices() {
  return (
    <section id="usluge" className="bg-sn-ivory">
      <div className="mx-auto max-w-[1180px] px-6 py-[88px]">
        <div className="mb-12 max-w-[620px]">
          <Eyebrow tone="lilac">{services.eyebrow}</Eyebrow>
          <SectionHeading className="mb-4">{services.title}</SectionHeading>
          <p className="text-sn-ink/70 text-base leading-[1.8]">
            {services.lead}
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[22px]">
          {services.cards.map((card) => {
            const fill = FILLS[card.fill];
            return (
              <article
                key={card.title}
                className={cn(
                  "flex flex-col gap-[18px] rounded-[20px] border px-8 py-9",
                  fill.card,
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3
                    className={cn(
                      "font-sn-display min-w-0 text-[31px] leading-[1.24] font-normal",
                      fill.title,
                    )}
                  >
                    {card.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-[13px] py-[7px] text-[11px] tracking-[0.14em] whitespace-nowrap uppercase",
                      fill.badge,
                    )}
                  >
                    {card.badge}
                  </span>
                </div>

                <p className={cn("text-[15px] leading-[1.75]", fill.body)}>
                  {card.body}
                </p>

                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {card.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className={cn(
                        "flex gap-2.5 text-[15px] leading-[1.6]",
                        fill.bulletText,
                      )}
                    >
                      <span aria-hidden className={fill.bullet}>
                        —
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-3">
                  <BookButton
                    variant={fill.cta}
                    className="w-full px-6 py-[15px]"
                  >
                    {card.cta}
                  </BookButton>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
