"use client";

import { therapists } from "@/content/therapists";

/**
 * A therapist dropdown that reads the CTA wire format the `byline.author` slot
 * stores, but shows only a list of names to the author.
 *
 * The wire format { action: "VIEW_THERAPIST", label: "...", targetId: "therapist:slug" }
 * is a contract detail — the author never sees `action`, `VIEW_THERAPIST`, CTA
 * or `targetId` (D-062). The field reads and writes that shape transparently.
 */

const CTA_ACTION = "VIEW_THERAPIST" as const;

export interface CtaAuthorValue {
  action?: string;
  label?: string;
  targetId?: string;
}

function buildCta(slug: string): CtaAuthorValue {
  const therapist = therapists.find((t) => t.slug === slug);
  if (!therapist)
    return { action: CTA_ACTION, label: slug, targetId: `therapist:${slug}` };
  return {
    action: CTA_ACTION,
    label: therapist.name,
    targetId: `therapist:${therapist.slug}`,
  };
}

export function extractTherapistSlug(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const cta = value as CtaAuthorValue;
  if (typeof cta.targetId !== "string") return null;
  const [prefix, ...rest] = cta.targetId.split(":");
  if (prefix !== "therapist") return null;
  return rest.join(":") || null;
}

export function ArticleAuthorField({
  value,
  onChange,
  disabled,
}: {
  value: unknown;
  onChange: (next: CtaAuthorValue) => void;
  disabled?: boolean;
}) {
  const currentSlug = extractTherapistSlug(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-ink-70 text-[13px] font-medium">
        Autor teksta
      </label>
      <select
        value={currentSlug ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const slug = event.target.value;
          if (!slug) return;
          onChange(buildCta(slug));
        }}
        className="border-line-strong text-ink-90 bg-surface focus-visible:ring-coffee rounded-full border px-4 py-2.5 text-[13px] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Autor teksta"
      >
        <option value="" disabled={currentSlug !== null}>
          {currentSlug ? "—" : "Izaberite autora…"}
        </option>
        {therapists.map((therapist) => (
          <option key={therapist.slug} value={therapist.slug}>
            {therapist.name}
          </option>
        ))}
      </select>
      <p className="text-ink-45 text-[11.5px] leading-[1.45]">
        Osoba koja javno potpisuje tekst. Biće prikazana na početku članka.
      </p>
    </div>
  );
}
