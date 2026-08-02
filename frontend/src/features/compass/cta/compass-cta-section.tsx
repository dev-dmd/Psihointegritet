"use client";

import { useCallback, useSyncExternalStore } from "react";

import { Reveal } from "@/components/motion/reveal";

import { CompassQuizLauncher } from "../quiz/compass-quiz-launcher";
import { CompassCtaBanner } from "./compass-cta-banner";
import { CompassCtaPreviewControl } from "./cta-preview-control";
import {
  compassCtaSchemeIds,
  compassCtaSchemes,
  compassCtaVariantIds,
  defaultCompassCtaScheme,
  defaultCompassCtaVariant,
  type CompassCtaSchemeId,
  type CompassCtaVariantId,
} from "./cta-schemes";

const STORAGE_KEY = "psihointegritet:compass-cta-preview";
/** Same-tab writes do not fire `storage`, so the store notifies itself. */
const CHANGE_EVENT = "psihointegritet:compass-cta-preview-change";

function isVariant(value: unknown): value is CompassCtaVariantId {
  return compassCtaVariantIds.some((id) => id === value);
}

function isScheme(value: unknown): value is CompassCtaSchemeId {
  return compassCtaSchemeIds.some((id) => id === value);
}

/**
 * The preview choice is external state (session storage), so it is read through
 * `useSyncExternalStore` rather than mirrored into React state from an effect.
 * The snapshot is the raw string — a stable primitive, which the API requires —
 * and parsing happens during render.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The server has no session storage; it always renders the defaults. */
function getServerSnapshot(): string | null {
  return null;
}

function parseChoice(raw: string | null): {
  variant: CompassCtaVariantId;
  scheme: CompassCtaSchemeId;
} {
  const fallback = {
    variant: defaultCompassCtaVariant,
    scheme: defaultCompassCtaScheme,
  };
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    const { variant, scheme } = parsed as Record<string, unknown>;
    return {
      variant: isVariant(variant) ? variant : fallback.variant,
      scheme: isScheme(scheme) ? scheme : fallback.scheme,
    };
  } catch {
    return fallback;
  }
}

/**
 * Landing-page Kompas CTA.
 *
 * The banner is presentational; this island decides only which variant and
 * scheme are shown. On the production path (`previewEnabled` false) it renders
 * one banner from the defaults and reads no storage at all.
 */
export function CompassCtaSection({
  previewEnabled = false,
}: {
  previewEnabled?: boolean;
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stored = parseChoice(previewEnabled ? raw : null);

  const write = useCallback(
    (next: { variant: CompassCtaVariantId; scheme: CompassCtaSchemeId }) => {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode or a full quota — the choice just does not persist.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [],
  );

  return (
    <section
      aria-labelledby="kompas-cta-title"
      className="scroll-mt-24 pt-[72px] md:pt-32"
    >
      <h2 id="kompas-cta-title" className="sr-only">
        Kompas mentalnog zdravlja
      </h2>

      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        {previewEnabled ? (
          <CompassCtaPreviewControl
            variant={stored.variant}
            scheme={stored.scheme}
            onVariantChange={(variant) => write({ ...stored, variant })}
            onSchemeChange={(scheme) => write({ ...stored, scheme })}
          />
        ) : null}

        <Reveal>
          <CompassQuizLauncher>
            {(open) => (
              <CompassCtaBanner
                variant={stored.variant}
                scheme={compassCtaSchemes[stored.scheme]}
                onStart={open}
              />
            )}
          </CompassQuizLauncher>
        </Reveal>
      </div>
    </section>
  );
}
