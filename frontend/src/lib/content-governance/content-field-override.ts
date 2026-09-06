import type { ContentTemplate } from "./types";

export type ContentFieldOverride<T> =
  { mode: "inherit" } | { mode: "custom"; value: T } | { mode: "hidden" };

export type NormalizedContentField<T = unknown> =
  | { mode: "inherit"; valid: true; explicit: boolean }
  | { mode: "custom"; valid: true; explicit: boolean; value: T }
  | { mode: "hidden"; valid: true; explicit: true }
  | { mode: "inherit"; valid: false; explicit: true };

/**
 * Only optional, purely presentational fields may disappear independently.
 * Required headings, CTA labels/actions, images/alt data and SEO fields are
 * deliberately absent. Slot-level `hidden` remains governed by slot-schema.
 */
export const hiddenContentFieldPaths: ReadonlySet<string> = new Set([
  "service_detail.hero.eyebrow",
  "service_detail.hero.lead",
  "therapist_profile.hero.badge",
  "therapist_profile.hero.quote",
  "therapist_profile.hero.formats",
  "therapist_profile.approach.intro",
  "therapist_profile.bio.cardExcerpt",
  "program_detail.facts.details",
  "program_detail.facts.note",
  "company_page.hero.lead",
  "company_page.privacy.title",
  "company_page.privacy.description",
  "company_page.configurator_cta.bannerHeading",
  "company_page.configurator_cta.bannerBody",
  "pricing_page.notice.body",
  "static_information.hero.heroLead",
  "article_detail.hero.lead",
  "article_detail.questions.intro",
  "article_detail.practice.title",
  "article_detail.body_outro.body",
]);

export function contentFieldPath(
  template: ContentTemplate,
  slotName: string,
  fieldName: string,
): string {
  return `${template}.${slotName}.${fieldName}`;
}

export function canHideContentField(
  template: ContentTemplate,
  slotName: string,
  fieldName: string,
): boolean {
  return hiddenContentFieldPaths.has(
    contentFieldPath(template, slotName, fieldName),
  );
}

/**
 * Backward-compatible read boundary for CMS JSON.
 *
 * Legacy primitives/objects/arrays are authored values. Legacy absence,
 * null and blank text inherit. A mapping with a `mode` key is treated as the
 * new wrapper and must match it exactly; malformed wrappers fail closed to
 * inherit and are rejected by authoring validation.
 */
export function normalizeContentFieldOverride<T = unknown>(
  raw: unknown,
): NormalizedContentField<T> {
  if (
    raw === undefined ||
    raw === null ||
    (typeof raw === "string" && !raw.trim())
  ) {
    return { mode: "inherit", valid: true, explicit: false };
  }

  if (typeof raw === "object" && !Array.isArray(raw) && "mode" in raw) {
    const wrapper = raw as Record<string, unknown>;
    const keys = Object.keys(wrapper).sort();
    if (wrapper.mode === "inherit" && keys.length === 1 && keys[0] === "mode") {
      return { mode: "inherit", valid: true, explicit: true };
    }
    if (wrapper.mode === "hidden" && keys.length === 1 && keys[0] === "mode") {
      return { mode: "hidden", valid: true, explicit: true };
    }
    if (
      wrapper.mode === "custom" &&
      keys.length === 2 &&
      keys[0] === "mode" &&
      keys[1] === "value" &&
      wrapper.value !== undefined &&
      wrapper.value !== null
    ) {
      return {
        mode: "custom",
        valid: true,
        explicit: true,
        value: wrapper.value as T,
      };
    }
    return { mode: "inherit", valid: false, explicit: true };
  }

  return {
    mode: "custom",
    valid: true,
    explicit: false,
    value: raw as T,
  };
}

export function resolveContentField<T>(
  raw: unknown,
  fallback: T,
): { mode: "inherit" | "custom" | "hidden"; value?: T } {
  const normalized = normalizeContentFieldOverride<T>(raw);
  if (!normalized.valid || normalized.mode === "inherit") {
    return { mode: "inherit", value: fallback };
  }
  if (normalized.mode === "hidden") return { mode: "hidden" };
  return { mode: "custom", value: normalized.value };
}
