import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";
import { EyebrowOnDark } from "@/features/tenants/sanja-neuer/ui/eyebrow";

const { ctaBand } = sanjaContent;

/**
 * The last ask before the footer, and the anchor the sticky bar watches: once
 * `#kontakt` is in view the bar hides, because repeating the same CTA twice on
 * one screen is nagging rather than helping.
 */
export function SanjaCtaBand() {
  return (
    <section id="kontakt" className="bg-sn-ivory px-6 pt-10 pb-[88px]">
      <div className="bg-sn-burgundy mx-auto flex max-w-[1180px] flex-col items-center gap-[22px] rounded-[28px] px-10 py-20 text-center">
        <EyebrowOnDark>{ctaBand.eyebrow}</EyebrowOnDark>
        <h2 className="font-sn-display text-sn-ivory max-w-[760px] text-[clamp(32px,4.4vw,56px)] leading-[1.18] font-normal text-pretty">
          {ctaBand.title}
        </h2>
        <p className="text-sn-ivory/82 max-w-[520px] text-[17px] leading-[1.7]">
          {ctaBand.lead}
        </p>
        <BookButton variant="ivory" className="mt-1.5 px-9 py-[17px]">
          {ctaBand.cta}
        </BookButton>
      </div>
    </section>
  );
}
