"use client";

import { cn } from "@/helpers/cn";
import { useTranslations } from "next-intl";

import {
  compassCtaSchemeIds,
  compassCtaSchemes,
  compassCtaVariantIds,
  type CompassCtaSchemeId,
  type CompassCtaVariantId,
} from "./cta-schemes";

/**
 * ⚠️ TEMPORARY — review control, not part of the page.
 *
 * Exists so the layout variant and colour scheme can be chosen live with the
 * client. It is rendered only behind `NEXT_PUBLIC_COMPASS_CTA_PREVIEW`, and the
 * whole feature is removed by deleting this file and its single call site in
 * `compass-cta-section.tsx`; the chosen variant and scheme then become the
 * defaults in `cta-schemes.ts`. Nothing else imports it.
 */
export function CompassCtaPreviewControl({
  variant,
  scheme,
  onVariantChange,
  onSchemeChange,
}: {
  variant: CompassCtaVariantId;
  scheme: CompassCtaSchemeId;
  onVariantChange: (next: CompassCtaVariantId) => void;
  onSchemeChange: (next: CompassCtaSchemeId) => void;
}) {
  const t = useTranslations("public.compass.preview");
  const schemeIndex = compassCtaSchemeIds.indexOf(scheme);
  const stepScheme = (delta: number) => {
    const next =
      (schemeIndex + delta + compassCtaSchemeIds.length) %
      compassCtaSchemeIds.length;
    const nextScheme = compassCtaSchemeIds[next];
    if (nextScheme) onSchemeChange(nextScheme);
  };

  return (
    <div className="rounded-tile border-coffee/20 bg-surface/50 mx-auto mb-4 flex max-w-[1536px] flex-wrap items-center gap-3 border border-dashed px-4 py-3">
      <span className="text-coffee/65 text-[10px] tracking-[0.14em] uppercase">
        {t("label")}
      </span>

      <div className="flex flex-wrap gap-1.5 sm:ml-auto">
        {compassCtaVariantIds.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === variant}
            onClick={() => onVariantChange(id)}
            className={cn(
              "min-h-11 cursor-pointer rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors",
              id === variant
                ? "border-forest bg-forest text-canvas"
                : "border-line-strong text-coffee/70 hover:border-coffee/40 bg-transparent",
            )}
          >
            {t("version", { id })}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label={t("previous")}
          onClick={() => stepScheme(-1)}
          className="border-line-strong bg-surface text-coffee grid h-11 w-11 cursor-pointer place-items-center rounded-full border"
        >
          ‹
        </button>

        {compassCtaSchemeIds.map((id) => (
          <button
            key={id}
            type="button"
            aria-label={compassCtaSchemes[id].label}
            aria-pressed={id === scheme}
            title={compassCtaSchemes[id].label}
            onClick={() => onSchemeChange(id)}
            className={cn(
              "h-6 w-6 cursor-pointer rounded-full border transition-[outline]",
              compassCtaSchemes[id].dot,
              id === scheme
                ? "border-forest outline-meadow border-2 outline-2 outline-offset-1"
                : "border-line-strong",
            )}
          />
        ))}

        <button
          type="button"
          aria-label={t("next")}
          onClick={() => stepScheme(1)}
          className="border-line-strong bg-surface text-coffee grid h-11 w-11 cursor-pointer place-items-center rounded-full border"
        >
          ›
        </button>

        <span className="text-coffee/70 text-[11px] tracking-[0.1em] uppercase">
          {compassCtaSchemes[scheme].label}
        </span>
      </div>
    </div>
  );
}
