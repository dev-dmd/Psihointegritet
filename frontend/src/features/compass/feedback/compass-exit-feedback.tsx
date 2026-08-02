"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SurveyDrawer } from "@/features/research/survey-drawer";

import {
  compassFeedbackAlreadyShown,
  CompassFeedbackBanner,
  markCompassFeedbackShown,
} from "./compass-feedback-banner";

/**
 * Shows the feedback prompt once, when someone navigates away from the Kompas
 * area through an internal link.
 *
 * Deliberately **not** `beforeunload`: a browser will not render custom content
 * on tab close, so a prompt hung there is simply never seen. Catching an
 * in-site navigation is the only moment this can actually be shown, which is
 * also what the design handoff concluded.
 *
 * The interception is one-shot per session and always offers a way onward — the
 * captured destination is followed as soon as the prompt is answered, so the
 * click is delayed, never swallowed.
 */
export function CompassExitFeedback() {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);

  useEffect(() => {
    if (compassFeedbackAlreadyShown()) return;

    const onClick = (event: MouseEvent) => {
      // Let the browser own modified clicks (new tab, download, etc.).
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || anchor.target === "_blank") return;
      // Same-origin, in-app paths only.
      if (!href.startsWith("/") || href.startsWith("//")) return;
      // Staying inside Kompas is not an exit.
      if (href === "/kompas" || href.startsWith("/kompas/")) return;
      if (compassFeedbackAlreadyShown()) return;

      event.preventDefault();
      markCompassFeedbackShown();
      setPendingHref(href);
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const leave = () => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href as Route);
  };

  return (
    <>
      <CompassFeedbackBanner
        open={pendingHref !== null && !surveyOpen}
        onAccept={() => setSurveyOpen(true)}
        onDismiss={leave}
      />

      <SurveyDrawer
        surveyStableId="compass-experience"
        surface="compass-feedback"
        trigger="finish"
        open={surveyOpen}
        onClose={() => {
          // Closing the survey resumes the click that opened the prompt, so
          // the navigation is never lost.
          setSurveyOpen(false);
          leave();
        }}
      />
    </>
  );
}
