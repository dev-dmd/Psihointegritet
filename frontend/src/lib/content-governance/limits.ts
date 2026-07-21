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
  };

interface TemplateDefinition {
  requiredSlots: readonly string[];
  optionalSlots: readonly string[];
  maxOptionalSections: number;
}

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
    maxOptionalSections: 2,
  },
  therapist_profile: {
    requiredSlots: ["hero", "approach", "areas", "services", "bio", "cta"],
    optionalSlots: ["faq", "media"],
    maxOptionalSections: 2,
  },
  support_area: {
    requiredSlots: ["hero", "intro", "related", "cta"],
    optionalSlots: ["faq"],
    maxOptionalSections: 1,
  },
  audience_page: {
    requiredSlots: ["hero", "audience", "first_step", "related", "cta"],
    optionalSlots: ["program_cards", "faq"],
    maxOptionalSections: 2,
  },
  program_detail: {
    requiredSlots: ["hero", "facts", "audience", "format", "status"],
    optionalSlots: ["facilitators", "faq", "registration"],
    maxOptionalSections: 3,
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
    maxOptionalSections: 1,
  },
  pricing_page: {
    requiredSlots: ["service_prices", "packages", "notice", "cta"],
    optionalSlots: ["program_references"],
    maxOptionalSections: 1,
  },
  static_information: {
    requiredSlots: ["hero", "intro"],
    optionalSlots: ["prose", "cta", "faq"],
    maxOptionalSections: 6,
  },
  legal_page: {
    requiredSlots: ["title", "legal_copy", "version"],
    optionalSlots: ["links"],
    maxOptionalSections: 1,
  },
};

export const widgetPlacementRegistry: Record<WidgetId, readonly string[]> = {
  matching: ["hero_cta", "guide_cta"],
  booking: ["service", "therapist", "booking"],
  company_configurator: ["company"],
  program_interest: ["program"],
  research_survey: ["survey_trigger"],
};
