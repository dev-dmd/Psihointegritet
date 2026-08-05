"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { cn } from "@/helpers/cn";

import type {
  ArticleCompletionState,
  ArticleStepId,
} from "./article-completion";
import { stepParam } from "./article-completion";

/**
 * A clickable five-step progress bar.
 *
 * The step order (D-063):
 *   1. Osnovni podaci
 *   2. Tekst
 *   3. Oblast i teme
 *   4. Kako Kompas koristi tekst
 *   5. Pregled i slanje
 *
 * Reads the active step from `?korak=`, writes it on click. The editor
 * sections are plain `<section id={anchor}>` blocks — clicking a step
 * pushes the URL and the section scrolls into view through CSS `scroll-margin`.
 */
export function ArticleStepper({ state }: { state: ArticleCompletionState }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("korak");

  const navigate = useCallback(
    (step: ArticleStepId) => {
      const params = new URLSearchParams(searchParams.toString());
      const param = stepParam(step);
      if (param === activeParam) return;
      params.set("korak", param);
      router.push(`?${params.toString()}`, { scroll: false });
      // Scroll to the section after the URL updates.
      setTimeout(() => {
        document
          .getElementById(`compass-step-${step}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    },
    [router, searchParams, activeParam],
  );

  return (
    <ol
      className="flex flex-wrap gap-2"
      role="list"
      aria-label="Koraci uređivanja"
    >
      {state.steps.map((step) => {
        const isCurrent = step.id === state.currentStep;
        const isClickable = !step.blocked;

        const base =
          "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors";
        const tone = step.hasProblem
          ? "border-badge-amber/50 bg-badge-amber-bg text-amber-11"
          : step.blocked
            ? "border-line bg-transparent text-ink-45"
            : step.done
              ? "border-sage bg-sage/12 text-forest"
              : isCurrent
                ? "border-forest bg-forest/10 text-forest"
                : "border-line-strong bg-transparent text-ink-55";

        const content = (
          <>
            <span aria-hidden>
              {step.done ? "✓" : step.blocked ? "—" : step.ordinal}
            </span>{" "}
            {step.label}
            {step.hasProblem ? (
              <span className="ml-1 text-[11px]" aria-label="ima problem">
                ⚠
              </span>
            ) : null}
          </>
        );

        if (!isClickable) {
          return (
            <li
              key={step.id}
              className={cn(base, tone, "cursor-not-allowed")}
              title={
                step.blocked
                  ? "Prvo završite prethodne korake."
                  : (step.problemSummary ?? undefined)
              }
            >
              {content}
            </li>
          );
        }

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => navigate(step.id)}
              className={cn(
                base,
                tone,
                "focus-visible:ring-coffee cursor-pointer hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
              )}
              title={
                step.problemSummary
                  ? step.problemSummary
                  : step.done
                    ? "Ovaj korak je završen."
                    : isCurrent
                      ? "Trenutni korak."
                      : "Skoči na ovaj korak."
              }
            >
              {content}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
