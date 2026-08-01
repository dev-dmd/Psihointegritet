import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

const toneClasses = {
  /** Matches the homepage hero card — the safe default for inner pages. */
  surface: "bg-surface",
  forest: "bg-forest",
  /** Pair with text-coffee + <Eyebrow tone="coffee"> — matches workshop.tsx's bg-warm section. */
  warm: "bg-warm/20",
  meadow: "bg-meadow/28",
} as const;

interface PageHeroProps {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  /** Section id for in-page anchors, e.g. "tim", "profil". */
  id?: string;
  className?: string;
}

/**
 * Public-page hero block — the one-block version of the homepage hero.
 *
 * The homepage hero is two layers: a tall image, then a white card pulled up
 * over it with a negative margin. That works there because the image alone
 * provides enough height to clear the absolute SiteHeader before the card's
 * own text ever appears. Inner pages have no tall image, so this component
 * collapses both layers into a single rounded block (same radius as the
 * homepage image: rounded-3xl / md:rounded-[32px]) and gives its content its
 * own top padding to clear the header directly — no overlap, no negative
 * margin.
 *
 * Padding-top is sized from the rendered header height (measured: 84px
 * mobile, 94px desktop) plus the outer pt-6 gap this section already spends
 * before the block starts, plus room to breathe: 96px mobile / 152px desktop
 * of internal top padding puts the content at 120px / 176px from the
 * viewport top — comfortably clear in both cases.
 */
export function PageHero({
  children,
  tone = "surface",
  id,
  className,
}: PageHeroProps) {
  return (
    <section id={id} className={cn(id ? "scroll-mt-24" : undefined, "pt-6")}>
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <div
          className={cn(
            "rounded-3xl px-6 pt-[96px] pb-10 md:rounded-[32px] md:px-16 md:pt-[152px] md:pb-14",
            toneClasses[tone],
            className,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
