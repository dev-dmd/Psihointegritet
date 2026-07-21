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
 * Transitional drawer triggers retained while the route-level flow settles.
 * Current public CTAs use `/pronadji-podrsku` or `/zakazi`; do not use these
 * components for new navigation.
 */

/** Legacy pill trigger for an explicitly embedded drawer surface. */
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

/** Legacy button trigger matching ButtonLink styles. */
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

/** Legacy inline trigger for an explicitly embedded drawer surface. */
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
