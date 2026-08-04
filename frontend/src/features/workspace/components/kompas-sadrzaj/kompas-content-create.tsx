"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";

import { articleSlugIssue, suggestArticleSlug } from "../../article-identity";
import { TechnicalDetails } from "../taxonomy-term-form/technical-details";

/**
 * Formats a tenant can add content in.
 *
 * The four inactive ones are shown rather than hidden: an author who came to
 * add a video should learn that it is planned, not conclude the platform
 * cannot do it. They stay disabled because no template, no slot schema and no
 * public renderer exists for them — an active control would fail on save.
 */
const FORMATS = [
  { id: "article", label: "Članak", ready: true },
  { id: "video", label: "Video", ready: false },
  { id: "audio", label: "Audio", ready: false },
  { id: "pdf", label: "PDF", ready: false },
  { id: "worksheet", label: "Radni list", ready: false },
] as const;

export function CompassContentCreate({
  onCreate,
  isPending,
  serverError,
  takenSlugs,
}: {
  onCreate: (slug: string) => void;
  isPending: boolean;
  serverError: string | null;
  takenSlugs: readonly string[];
}) {
  const [title, setTitle] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const slug = suggestArticleSlug(title);
  const issue =
    articleSlugIssue(title) ??
    (takenSlugs.includes(slug)
      ? "Članak sa ovom adresom već postoji. Izmenite naslov."
      : null);
  const showIssue = submitted && issue !== null;

  return (
    <div className="rounded-panel border-line bg-surface border px-5 py-5">
      <h3 className="text-forest font-serif text-[17px]">
        Šta želite da kreirate?
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {FORMATS.map((format) => (
          <span
            key={format.id}
            aria-disabled={!format.ready}
            className={cn(
              "rounded-full border px-4 py-2 text-[12.5px] font-semibold",
              format.ready
                ? "border-coffee bg-coffee text-panel-canvas"
                : "border-line-strong text-ink-45 bg-transparent",
            )}
          >
            {format.label}
            {format.ready ? "" : " · u pripremi"}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <label
          htmlFor="compass-article-title"
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Naslov članka
        </label>
        <input
          id="compass-article-title"
          value={title}
          maxLength={160}
          disabled={isPending}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={showIssue}
          aria-describedby={showIssue ? "compass-article-title-error" : undefined}
          className={cn(
            "rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
            showIssue ? "border-danger" : "border-line-strong",
          )}
        />
        {showIssue ? (
          <p
            id="compass-article-title-error"
            className="text-danger mt-1.5 text-[12.5px] leading-[1.45]"
          >
            {issue}
          </p>
        ) : null}

        <TechnicalDetails summary="Adresa članka">
          <p className="text-ink-55 text-[12px] leading-[1.5]">
            Platforma je sama formira iz naslova i posle kreiranja se više ne
            menja.
          </p>
          <p className="text-ink-55 mt-1.5 font-mono text-[12.5px]">
            /znanje/{slug || "…"}
          </p>
        </TechnicalDetails>
      </div>

      {serverError ? (
        <p className="text-danger mt-3 text-[12.5px] leading-[1.45]">
          {serverError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setSubmitted(true);
          if (issue === null) onCreate(slug);
        }}
        className="border-coffee bg-coffee text-panel-canvas mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full border px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Kreiranje…" : "Napravi članak i otvori editor"}
      </button>
    </div>
  );
}
