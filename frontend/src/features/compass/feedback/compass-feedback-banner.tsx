"use client";

import { createPortal } from "react-dom";

const SESSION_KEY = "psihointegritet:compass-feedback-shown";

/** Once per session, whatever the trigger — abandoning the sheet and leaving a
 * Kompas page must not stack two prompts on the same visit. */
export function compassFeedbackAlreadyShown(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

export function markCompassFeedbackShown(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode — the prompt may reappear next navigation. Acceptable.
  }
}

/**
 * The feedback prompt shown after someone actually used Kompas.
 *
 * Copy is fixed and deliberately says the survey does not affect
 * recommendations: the answers go to the Research module and are never read by
 * the engine, so the sentence is a statement of fact, not reassurance.
 */
export function CompassFeedbackBanner({
  open,
  onAccept,
  onDismiss,
}: {
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  // `open` only ever becomes true from a client interaction, so `document`
  // exists by then; no mount flag is needed to make the portal safe.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kompas-feedback-title"
      className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-4 md:px-6 md:pb-6"
    >
      <div className="bg-surface shadow-panel-modal rounded-panel border-line mx-auto max-w-[720px] border px-5 py-5 md:px-7 md:py-6">
        <p
          id="kompas-feedback-title"
          className="text-forest font-serif text-[19px] leading-[1.3] md:text-[21px]"
        >
          Da li vam je Kompas pomogao da vidite sledeći korak?
        </p>
        <p className="text-coffee/70 mt-2 text-[13.5px] leading-[1.6]">
          Anketa traje oko minut i ne utiče na vaše preporuke.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onAccept}
            className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full px-5 text-[13.5px] font-semibold transition-colors"
          >
            Da, odvojiću minut
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="border-line-strong text-coffee/75 hover:border-coffee/40 min-h-11 cursor-pointer rounded-full border px-5 text-[13.5px] font-semibold transition-colors"
          >
            Ne sada
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
