import Image from "next/image";

import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { methodology } = sanjaContent;

/**
 * Three numbered rows separated by rules, with the last row closed by a bottom
 * rule so the group reads as a finished block rather than a list that was cut
 * off. The numerals get a fixed `min-w` so `I`, `II` and `III` share one
 * baseline grid instead of shifting their titles left as they widen.
 */
export function SanjaMethodology() {
  return (
    <section id="metod" className="mx-auto max-w-[1180px] px-6 py-[88px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-14">
        <div>
          <Eyebrow tone="burgundy">{methodology.eyebrow}</Eyebrow>
          <SectionHeading className="mb-5">{methodology.title}</SectionHeading>
          <p className="text-sn-ink/72 mb-7 text-base leading-[1.8]">
            {methodology.lead}
          </p>
          <div className="bg-sn-surface relative aspect-4/3 overflow-hidden rounded-[20px]">
            <Image
              src="/tenants/sanja-neuer/method-texture.jpeg"
              alt={methodology.textureAlt}
              fill
              sizes="(max-width: 900px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col">
          {methodology.steps.map((step, index) => (
            <div
              key={step.numeral}
              className={
                index === methodology.steps.length - 1
                  ? "border-sn-ink/14 flex gap-[22px] border-t border-b py-[26px]"
                  : "border-sn-ink/14 flex gap-[22px] border-t py-[26px]"
              }
            >
              <span className="font-sn-display text-sn-burgundy min-w-[34px] text-[22px] leading-[1.2]">
                {step.numeral}
              </span>
              <div>
                <h3 className="font-sn-display text-sn-ink mb-2.5 text-[26px] leading-[1.28] font-normal">
                  {step.title}
                </h3>
                <p className="text-sn-ink/72 text-[15px] leading-[1.75]">
                  {step.body}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-[30px] flex flex-wrap items-center gap-3.5">
            <BookButton variant="primary" className="px-7 py-[15px]">
              {methodology.primaryCta}
            </BookButton>
            <a
              href="#usluge"
              className="border-sn-ink/40 text-sn-ink hover:text-sn-burgundy border-b text-sm transition-colors"
            >
              {methodology.secondaryCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
