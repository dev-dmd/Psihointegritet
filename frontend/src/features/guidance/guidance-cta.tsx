"use client";

import type { ReactNode } from "react";

import {
  AnimatedCtaContent,
  animatedCtaClassName,
  type AnimatedCtaSize,
} from "@/components/ui/animated-cta";
import {
  buttonLinkVariants,
  type ButtonLinkVariant,
  type ButtonLinkSize,
} from "@/components/ui/button-link";
import { cn } from "@/helpers/cn";

import { useGuidance } from "./guidance-context";

/**
 * Buttons that look exactly like the navigational CTAs but open the guidance
 * drawer instead of navigating. Kept as thin client islands so server sections
 * (header, hero, support-paths) stay server components.
 */

/** „Zakaži termin" pill — opens the chooser (returning clients can skip the quiz). */
export function GuidanceCtaPill({
  label = "Zakaži termin",
  size = "md",
  className,
  entry = "chooser",
}: {
  label?: string;
  size?: AnimatedCtaSize;
  className?: string;
  entry?: "chooser" | "quiz";
}) {
  const { openChooser, openQuiz } = useGuidance();
  return (
    <button
      type="button"
      onClick={entry === "quiz" ? openQuiz : openChooser}
      className={cn(
        "cursor-pointer border-0",
        animatedCtaClassName(size, className),
      )}
    >
      <AnimatedCtaContent label={label} size={size} />
    </button>
  );
}

/** Solid/outline button matching ButtonLink — opens the quiz or chooser. */
export function GuidanceCtaButton({
  children,
  variant,
  size,
  className,
  entry = "quiz",
}: {
  children: ReactNode;
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  className?: string;
  entry?: "chooser" | "quiz";
}) {
  const { openChooser, openQuiz } = useGuidance();
  return (
    <button
      type="button"
      onClick={entry === "chooser" ? openChooser : openQuiz}
      className={cn(
        "cursor-pointer border-0",
        buttonLinkVariants({ variant, size }),
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Inline underlined text trigger — for „Već ste klijent? Zakažite naredni termin". */
export function GuidanceCtaText({
  children,
  className,
  entry = "chooser",
}: {
  children: ReactNode;
  className?: string;
  entry?: "chooser" | "quiz";
}) {
  const { openChooser, openQuiz } = useGuidance();
  return (
    <button
      type="button"
      onClick={entry === "chooser" ? openChooser : openQuiz}
      className={cn(
        "text-forest cursor-pointer border-0 bg-transparent p-0 font-semibold underline underline-offset-[3px]",
        className,
      )}
    >
      {children}
    </button>
  );
}
