import Image from "next/image";

import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";

const { hero } = sanjaContent;

/**
 * The one `h1` on the page, and the only section that animates on load.
 *
 * The portrait frame carries the design's asymmetric arch
 * (`200px 8px 200px 8px`) on both the frame and the lilac block behind it. The
 * block is positioned inside the relative container rather than bled off it —
 * the handoff calls this out because an overflowing block reintroduces the
 * horizontal scrollbar the whole layout is built to avoid at 360px.
 */
export function SanjaHero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))] items-center gap-14 px-6 pt-[72px] pb-10"
    >
      <div className="motion-safe:animate-[sn-rise_0.7s_ease_both]">
        <div className="mb-[22px] flex items-center gap-3">
          <span aria-hidden className="bg-sn-lilac block h-px w-[38px]" />
          <span className="text-sn-lilac-deep text-[11px] tracking-[0.24em] uppercase">
            {hero.eyebrow}
          </span>
        </div>

        <h1 className="font-sn-display text-sn-ink mb-6 text-[clamp(38px,5.4vw,68px)] leading-[1.16] font-normal tracking-[-0.01em] text-pretty">
          {hero.title}
        </h1>

        <p className="text-sn-ink/72 mb-8 max-w-[520px] text-[17px] leading-[1.75] text-pretty">
          {hero.lead}
        </p>

        <div className="flex flex-wrap items-center gap-3.5">
          <BookButton variant="primary" className="px-8 py-4">
            {hero.primaryCta}
          </BookButton>
          <a
            href="#metod"
            className="border-sn-lilac text-sn-ink hover:bg-sn-lilac/30 focus-visible:ring-sn-burgundy/40 rounded-full border px-[30px] py-4 text-[13px] tracking-[0.1em] uppercase transition-colors outline-none focus-visible:ring-2"
          >
            {hero.secondaryCta}
          </a>
        </div>

        <p className="text-sn-ink/55 mt-5 text-[13px] tracking-[0.04em]">
          {hero.micro}
        </p>
      </div>

      <div className="relative motion-safe:animate-[sn-fade_1s_ease_both]">
        <div
          aria-hidden
          className="bg-sn-lilac absolute right-0 -bottom-3.5 h-[70%] w-[68%] rounded-[200px_8px_200px_8px] opacity-50"
        />
        <div className="border-sn-ink/10 bg-sn-surface relative aspect-4/5 overflow-hidden rounded-[200px_8px_200px_8px] border p-2.5">
          <Image
            src="/tenants/sanja-neuer/hero-portrait.jpeg"
            alt={hero.portraitAlt}
            fill
            /* Eager, not `priority`. The architecture check refuses `priority`
               because it injects a preload into <head> and that wants review;
               but this is the LCP element, so letting it lazy-load would be a
               real regression. `eager` loads it immediately without asserting
               the preload. */
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 900px) 100vw, 45vw"
            className="rounded-[190px_4px_190px_4px] object-cover"
          />
        </div>
      </div>
    </section>
  );
}
