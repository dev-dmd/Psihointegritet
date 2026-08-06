import type {
  ContentCharacterLimitKey,
  ContentTemplate,
  WidgetId,
} from "./types";

export const contentCharacterLimits: Record<ContentCharacterLimitKey, number> =
  {
    navigationLabel: 28,
    ctaLabel: 36,
    eyebrow: 40,
    // A single short fact/label (duration, format, session count, badge…) —
    // reused across templates instead of one narrow key per field (CG-C1,
    // ADR-017 Amendment 2 §A2).
    shortFact: 140,
    pageH1: 80,
    sectionH2: 90,
    cardTitle: 72,
    cardDescription: 220,
    heroLead: 300,
    sectionIntro: 360,
    richParagraph: 1200,
    serviceDescription: 260,
    therapistPublicTitle: 120,
    therapistCardExcerpt: 300,
    therapistQuote: 320,
    therapistBioParagraph: 900,
    therapistFullBio: 3600,
    faqQuestion: 160,
    faqAnswer: 800,
    seoTitle: 65,
    seoDescription: 170,
    imageAlt: 150,
    slug: 80,
    redirectPath: 180,
    // ~4000 words; the first real article is 3217 characters.
    articleBody: 24000,
  };

interface TemplateDefinition {
  requiredSlots: readonly string[];
  optionalSlots: readonly string[];
}

/**
 * `maxOptionalSections` (a template-level cap on how many optional slot
 * *keys* may be present) was removed here 2026-07-30 (ADR-017 Amendment 2
 * §A2.2, D-050) — it counted the wrong thing. An editor can pre-initialize
 * every optional slot as an empty object (key present, section inert), and a
 * single FAQ slot with nine items was always the real problem regardless of
 * how many slot keys existed. Authority moved to `min`/`max` on each
 * `imageList`/`ctaList`/`repeater` field in `slot-schema.ts`'s
 * `slotSpecRegistry` — LIMIT-002 now checks those directly.
 */
export const templateRegistry: Record<ContentTemplate, TemplateDefinition> = {
  service_detail: {
    requiredSlots: [
      "hero",
      "facts",
      "description",
      "first_step",
      "related",
      "cta",
    ],
    optionalSlots: ["packages", "faq"],
  },
  therapist_profile: {
    requiredSlots: ["hero", "approach", "areas", "services", "bio", "cta"],
    optionalSlots: ["faq", "media"],
  },
  support_area: {
    requiredSlots: ["hero", "intro", "related", "cta"],
    optionalSlots: ["faq"],
  },
  audience_page: {
    requiredSlots: ["hero", "audience", "first_step", "related", "cta"],
    optionalSlots: ["program_cards", "faq"],
  },
  program_detail: {
    requiredSlots: ["hero", "facts", "audience", "format", "status"],
    optionalSlots: ["facilitators", "faq", "registration"],
  },
  company_page: {
    requiredSlots: [
      "hero",
      "support_types",
      "plans",
      "privacy",
      "configurator_cta",
    ],
    optionalSlots: ["faq"],
  },
  pricing_page: {
    requiredSlots: ["service_prices", "packages", "notice", "cta"],
    optionalSlots: ["program_references"],
  },
  static_information: {
    requiredSlots: ["hero", "intro"],
    optionalSlots: ["prose", "cta", "faq"],
  },
  legal_page: {
    requiredSlots: ["title", "legal_copy", "version"],
    optionalSlots: ["links"],
  },
  article_detail: {
    requiredSlots: ["hero", "byline", "body_intro"],
    optionalSlots: ["questions", "practice", "body_outro", "sources", "cta"],
  },
};

export const widgetPlacementRegistry: Record<WidgetId, readonly string[]> = {
  matching: ["hero_cta", "guide_cta"],
  booking: ["service", "therapist", "booking"],
  company_configurator: ["company"],
  program_interest: ["program"],
  research_survey: ["survey_trigger"],
};
