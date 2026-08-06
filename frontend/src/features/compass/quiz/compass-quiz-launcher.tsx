"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import {
  compassFeedbackAlreadyShown,
  CompassFeedbackBanner,
  markCompassFeedbackShown,
} from "../feedback/compass-feedback-banner";
import { SurveyDrawer } from "@/features/research/survey-drawer";

import { CompassQuiz } from "./compass-quiz";
import { CompassSheet } from "./compass-sheet";

/**
 * Owns the open state of the Kompas sheet and renders whatever trigger the host
 * gives it. Both the landing CTA and `/kompas` mount their own instance, so the
 * sheet needs no global provider.
 *
 * Closing the sheet counts as meaningful use, so the feedback prompt follows —
 * once per session, and never stacked on top of the sheet itself.
 */
export function CompassQuizLauncher({
  children,
}: {
  children: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const titleId = useId();
  const router = useRouter();

  const closeSheet = () => {
    setOpen(false);
    if (compassFeedbackAlreadyShown()) return;
    markCompassFeedbackShown();
    setFeedbackOpen(true);
  };

  return (
    <>
      {children(() => setOpen(true))}

      <CompassSheet open={open} labelledBy={titleId} onClose={closeSheet}>
        <CompassQuiz
          titleId={titleId}
          onClose={closeSheet}
          onRequestSupport={() => {
            // Intake stays the only authority for service and therapist. The
            // sheet closes without the feedback prompt: someone on their way to
            // ask for help must not be interrupted by a survey.
            setOpen(false);
            router.push("/pronadji-podrsku");
          }}
        />
      </CompassSheet>

      <CompassFeedbackBanner
        open={feedbackOpen}
        onAccept={() => {
          setFeedbackOpen(false);
          setSurveyOpen(true);
        }}
        onDismiss={() => setFeedbackOpen(false)}
      />

      <SurveyDrawer
        surveyStableId="compass-experience"
        surface="compass-feedback"
        trigger="after-results"
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
      />
    </>
  );
}
