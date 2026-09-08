import { cn } from "@/helpers/cn";
import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { frameworks } = sanjaContent;

/**
 * Three cards with three different fills, which is the section's whole idea:
 * the frameworks are not a list of equivalent options, and the design says so
 * by refusing to render them identically.
 */
const FILLS = {
  surface: {
    card: "bg-sn-surface border-transparent hover:border-sn-burgundy",
    index: "text-sn-lilac-deep",
    title: "text-sn-burgundy",
    body: "text-sn-ink/72",
  },
  burgundy: {
    card: "bg-sn-burgundy border-sn-burgundy hover:border-sn-ink",
    index: "text-sn-lilac",
    title: "text-sn-ivory",
    body: "text-sn-ivory/82",
  },
  ink: {
    card: "bg-sn-ink border-sn-ink hover:border-sn-burgundy",
    index: "text-sn-lilac",
    title: "text-sn-ivory",
    body: "text-sn-ivory/82",
  },
} as const;

export function SanjaFrameworks() {
  return (
    <section className="bg-sn-ivory">
      <div className="mx-auto max-w-[1180px] px-6 py-[88px]">
        <div className="mb-12 max-w-[620px]">
          <Eyebrow tone="lilac">{frameworks.eyebrow}</Eyebrow>
          <SectionHeading className="mb-4">{frameworks.title}</SectionHeading>
          <p className="text-sn-ink/70 text-base leading-[1.8]">
            {frameworks.lead}
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,270px),1fr))] gap-5">
          {frameworks.cards.map((card) => {
            const fill = FILLS[card.fill];
            return (
              <article
                key={card.index}
                className={cn(
                  "flex flex-col gap-3.5 rounded-[20px] border px-7 py-8 transition-colors",
                  fill.card,
                )}
              >
                <span
                  className={cn(
                    "text-[11px] tracking-[0.2em] uppercase",
                    fill.index,
                  )}
                >
                  {card.index}
                </span>
                <h3
                  className={cn(
                    "font-sn-display text-[27px] leading-[1.28] font-normal",
                    fill.title,
                  )}
                >
                  {card.title}
                </h3>
                <p className={cn("text-[15px] leading-[1.75]", fill.body)}>
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
