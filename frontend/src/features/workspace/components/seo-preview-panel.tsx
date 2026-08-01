"use client";

import { contentCharacterLimits } from "@/lib/content-governance/limits";
import type { SeoFields } from "@/lib/content-governance/types";

export function SeoPreviewPanel({
  route,
  value,
  onChange,
  disabled,
}: {
  route: string;
  value: SeoFields;
  onChange: (next: SeoFields) => void;
  disabled: boolean;
}) {
  const descriptionWarning =
    !value.description.trim() ||
    value.description.trim().toLocaleLowerCase("sr-Latn") ===
      value.title.trim().toLocaleLowerCase("sr-Latn");

  return (
    <section className="rounded-panel border-line bg-surface mb-4 border px-4 py-4">
      <div className="mb-3">
        <h3 className="text-forest font-serif text-lg font-normal">
          SEO i deljenje
        </h3>
        <p className="text-ink-55 mt-1 text-[12.5px]">
          Pregled koristi isti title, description i OG asset koje javni
          discoverability sloj čita.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-ink-70 text-[13px] font-semibold">
          SEO naslov
          <input
            aria-label="SEO naslov"
            disabled={disabled}
            maxLength={contentCharacterLimits.seoTitle}
            value={value.title}
            onChange={(event) =>
              onChange({ ...value, title: event.target.value })
            }
            className="border-line-strong bg-panel-canvas text-coffee focus:border-sage mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
          />
          <span className="text-ink-55 mt-1 block text-right text-[11.5px]">
            {value.title.length}/{contentCharacterLimits.seoTitle}
          </span>
        </label>
        <label className="text-ink-70 text-[13px] font-semibold">
          OG image asset ID
          <input
            aria-label="OG image asset ID"
            disabled={disabled}
            value={value.ogImageAssetId ?? ""}
            onChange={(event) => {
              const ogImageAssetId = event.target.value;
              onChange(
                ogImageAssetId
                  ? { ...value, ogImageAssetId }
                  : {
                      title: value.title,
                      description: value.description,
                    },
              );
            }}
            className="border-line-strong bg-panel-canvas text-coffee focus:border-sage mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
          />
        </label>
      </div>
      <label className="text-ink-70 mt-2 block text-[13px] font-semibold">
        SEO opis
        <textarea
          aria-label="SEO opis"
          disabled={disabled}
          maxLength={contentCharacterLimits.seoDescription}
          rows={3}
          value={value.description}
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
          className="border-line-strong bg-panel-canvas text-coffee focus:border-sage mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
        />
        <span className="text-ink-55 mt-1 block text-right text-[11.5px]">
          {value.description.length}/{contentCharacterLimits.seoDescription}
        </span>
      </label>

      {descriptionWarning ? (
        <p className="border-badge-amber/40 bg-badge-amber-bg text-coffee mt-3 rounded-lg border px-3 py-2 text-[12.5px]">
          SEO opis treba da bude popunjen i različit od naslova.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="truncate text-[12px] text-slate-700">
            psihointegritet.com{route}
          </div>
          <div className="mt-1 line-clamp-1 text-[19px] text-blue-700">
            {value.title || "Naslov stranice"}
          </div>
          <div className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-slate-600">
            {value.description || "Opis će se prikazati ovde."}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex aspect-[1.91/1] items-center justify-center bg-slate-100 px-4 text-center text-xs text-slate-500">
            {value.ogImageAssetId
              ? `OG asset: ${value.ogImageAssetId}`
              : "Sistemska OG slika"}
          </div>
          <div className="px-4 py-3">
            <div className="line-clamp-1 text-sm font-semibold text-slate-900">
              {value.title || "Naslov stranice"}
            </div>
            <div className="line-clamp-2 text-xs text-slate-600">
              {value.description || "Opis deljenja"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
