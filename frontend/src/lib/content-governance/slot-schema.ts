/**
 * Slot schema registry (CG-C1) — ADR-017 §9, corrected by Amendment 2
 * (D-050, 2026-07-30) before any `slot_data` existed against it.
 *
 * Mirrors `backend/src/psihointegritet/shared/domain/slot_schema.py` field
 * for field. Parity between the two is asserted by
 * `contracts/fixtures/slot-schema.v1.json` (CG-A2 pattern).
 *
 * A slot has a state above its fields (`SlotSpec.editability`) because an
 * empty field map is ambiguous otherwise: it could mean "this slot is
 * derived at render time, never authored" (`computed` — e.g. a filtered
 * therapist list) or "we have no evidence of this slot's real shape yet"
 * (`unmodeled` — e.g. `support_area`, which has no page anywhere in the
 * repository). Only `editable` slots carry real `SlotFieldSpec` fields.
 *
 * `SlotFieldSpec` is deliberately NOT recursive through the three collection
 * kinds (`repeater.item` excludes `repeater`/`imageList`/`ctaList`) — one
 * level of nesting only. Unbounded nesting is the first step toward a free
 * page builder, which D-047 explicitly rules out.
 */

import type {
  ContentCharacterLimitKey,
  ContentTemplate,
  ContentType,
  CtaAction,
} from "./types";

export type SlotFieldSpec =
  | { kind: "text"; limit: ContentCharacterLimitKey; required?: boolean }
  | {
      kind: "rich";
      maxBlocks: number;
      /** Omitted for fields with no reasonable character ceiling (e.g. a
       * full legal document body) — `maxBlocks` is still a safety limit. */
      maxChars?: ContentCharacterLimitKey;
      required?: boolean;
    }
  | {
      kind: "integer";
      min: number;
      max: number;
      step?: number;
      unit?: "minute" | "session" | "participant";
      required?: boolean;
    }
  | {
      kind: "money";
      currency: "RSD";
      min: number;
      max: number;
      required?: boolean;
    }
  | { kind: "image"; required?: boolean }
  | { kind: "imageList"; min: number; max: number }
  | {
      kind: "cta";
      allowedActions: readonly CtaAction[];
      targetType?: ContentType;
      required?: boolean;
    }
  | {
      kind: "ctaList";
      min: number;
      max: number;
      allowedActions: readonly CtaAction[];
      targetType?: ContentType;
    }
  | {
      kind: "repeater";
      min: number;
      max: number;
      item: Record<string, NonRepeaterFieldSpec>;
    };

/** Every `SlotFieldSpec` kind except the three collection kinds — what a
 * `repeater` item's own fields are allowed to be (Amendment 2 §A2.5). */
export type NonRepeaterFieldSpec = Exclude<
  SlotFieldSpec,
  { kind: "repeater" | "imageList" | "ctaList" }
>;

export type SlotSpec =
  | {
      editability: "editable";
      required: boolean;
      visibility: "fixed" | "toggleable";
      fields: Record<string, SlotFieldSpec>;
    }
  | { editability: "computed"; reason: string; fields: Record<string, never> }
  | { editability: "unmodeled"; reason: string; fields: Record<string, never> };

/**
 * Payload shape for an `editable` slot's *value* in `slot_data` (D-038
 * field-level fallback, locked here rather than deferred to CG-C3 —
 * Amendment 2 §A2.3). `inherit` uses the full static fallback; `override`
 * carries authored `fields`, and a field missing within an override still
 * falls back to its static counterpart where one exists; `hidden` is only a
 * legal `mode` for a `visibility: "toggleable"` slot — a `visibility:
 * "fixed"` (required) slot may never be `hidden`. An empty string field
 * value normalizes to absent at save time rather than a hollow override.
 */
export interface SlotOverride {
  mode: "inherit" | "override" | "hidden";
  fields?: Record<string, unknown>;
}

function editable(
  required: boolean,
  visibility: "fixed" | "toggleable",
  fields: Record<string, SlotFieldSpec>,
): SlotSpec {
  return { editability: "editable", required, visibility, fields };
}

function computed(reason: string): SlotSpec {
  return { editability: "computed", reason, fields: {} };
}

function unmodeled(reason: string): SlotSpec {
  return { editability: "unmodeled", reason, fields: {} };
}

const faqItems: SlotFieldSpec = {
  kind: "repeater",
  min: 0,
  max: 10,
  item: {
    question: { kind: "text", limit: "faqQuestion", required: true },
    answer: { kind: "text", limit: "faqAnswer", required: true },
  },
};

const packageItems: SlotFieldSpec = {
  kind: "repeater",
  min: 0,
  max: 6,
  item: {
    title: { kind: "text", limit: "cardTitle", required: true },
    deadline: { kind: "text", limit: "cardDescription", required: true },
    priceAmount: {
      kind: "money",
      currency: "RSD",
      min: 0,
      max: 500_000,
      required: true,
    },
    fullPriceAmount: { kind: "money", currency: "RSD", min: 0, max: 500_000 },
  },
};

export const slotSpecRegistry: Record<
  ContentTemplate,
  Record<string, SlotSpec>
> = {
  service_detail: {
    hero: editable(true, "fixed", {
      eyebrow: { kind: "text", limit: "eyebrow" },
      title: { kind: "text", limit: "pageH1", required: true },
      lead: { kind: "text", limit: "heroLead" },
    }),
    facts: editable(true, "fixed", {
      duration: { kind: "text", limit: "shortFact", required: true },
      format: { kind: "text", limit: "shortFact", required: true },
      // priceAmount is computed (formatRsd over ServiceCatalogItem.priceAmount)
      // and rendered live — never stored as a field.
    }),
    description: editable(true, "fixed", {
      body: {
        kind: "rich",
        maxBlocks: 6,
        maxChars: "richParagraph",
        required: true,
      },
    }),
    first_step: editable(true, "fixed", {
      body: {
        kind: "rich",
        maxBlocks: 3,
        maxChars: "richParagraph",
        required: true,
      },
    }),
    related: computed(
      "Terapeuti filtrirani po ServiceCatalogItem.therapistIds/bookingServiceSlugs i izvedene lokacije — nema autorskog polja.",
    ),
    cta: editable(true, "fixed", {
      primary: {
        kind: "cta",
        allowedActions: ["BOOK_SERVICE"],
        targetType: "service",
        required: true,
      },
    }),
    packages: editable(false, "toggleable", { items: packageItems }),
    faq: editable(false, "toggleable", { items: faqItems }),
  },

  therapist_profile: {
    hero: editable(true, "fixed", {
      badge: { kind: "text", limit: "shortFact" },
      name: { kind: "text", limit: "cardTitle", required: true },
      title: { kind: "text", limit: "therapistPublicTitle", required: true },
      quote: { kind: "text", limit: "therapistQuote" },
      formats: { kind: "text", limit: "shortFact" },
      image: { kind: "image", required: true },
    }),
    approach: editable(true, "fixed", {
      intro: { kind: "rich", maxBlocks: 4, maxChars: "therapistBioParagraph" },
    }),
    areas: editable(true, "fixed", {
      items: {
        kind: "repeater",
        min: 1,
        max: 12,
        item: { label: { kind: "text", limit: "shortFact", required: true } },
      },
    }),
    services: editable(true, "fixed", {
      // The catalog-derived service list (name/duration/price per
      // bookingServiceSlugs) is computed and rendered live, not a field.
      additionalServices: {
        kind: "repeater",
        min: 0,
        max: 8,
        item: {
          title: { kind: "text", limit: "cardTitle", required: true },
          duration: { kind: "text", limit: "shortFact" },
          price: { kind: "text", limit: "shortFact" },
        },
      },
    }),
    bio: editable(true, "fixed", {
      body: {
        kind: "rich",
        maxBlocks: 10,
        maxChars: "therapistFullBio",
        required: true,
      },
      cardExcerpt: { kind: "text", limit: "therapistCardExcerpt" },
    }),
    cta: editable(true, "fixed", {
      primary: {
        kind: "cta",
        allowedActions: ["BOOK_THERAPIST"],
        targetType: "therapist",
        required: true,
      },
    }),
    faq: editable(false, "toggleable", { items: faqItems }),
    media: unmodeled(
      "Therapist tip ima samo pojedinačan portret (već u hero.image) — nema galerije/video polja, nema dokaza o obliku.",
    ),
  },

  // No page, no ContentEntity, no rendered component anywhere in the
  // repository for support_area — every slot stays unmodeled rather than
  // guessing a shape for a template no one has committed to building.
  support_area: {
    hero: unmodeled(
      "Nema dokaza — nijedna stranica ne koristi support_area template.",
    ),
    intro: unmodeled(
      "Nema dokaza — nijedna stranica ne koristi support_area template.",
    ),
    related: unmodeled(
      "Nema dokaza — nijedna stranica ne koristi support_area template.",
    ),
    cta: unmodeled(
      "Nema dokaza — nijedna stranica ne koristi support_area template.",
    ),
    faq: unmodeled(
      "Nema dokaza — nijedna stranica ne koristi support_area template.",
    ),
  },

  audience_page: {
    hero: editable(true, "fixed", {
      h1: { kind: "text", limit: "pageH1", required: true },
    }),
    audience: unmodeled(
      "podrska-roditeljima/page.tsx nije pročitan u istraživanju; static-provider nema audience textField za ovaj entitet.",
    ),
    first_step: unmodeled(
      "Isti razlog kao audience — nema zabeleženog textField-a za ovu stranicu.",
    ),
    related: computed(
      "parentPrograms() filtrirano po audienceTags — izvedeno, ne autorsko.",
    ),
    cta: editable(true, "fixed", {
      primary: {
        kind: "cta",
        allowedActions: ["BOOK_SERVICE"],
        targetType: "service",
        required: true,
      },
    }),
    program_cards: computed(
      "Isti computed repeater kao related — parentPrograms() filter.",
    ),
    faq: unmodeled("Nema FAQ podataka vezanih za ovu specifičnu stranicu."),
  },

  program_detail: {
    hero: editable(true, "fixed", {
      title: { kind: "text", limit: "cardTitle", required: true },
      // eyebrow ("Cena potvrđena" / "Program u pripremi") is a computed
      // label derived from GroupProgram.status, not free text.
    }),
    facts: editable(true, "fixed", {
      sessions: { kind: "text", limit: "shortFact", required: true },
      details: { kind: "text", limit: "shortFact" },
      priceLine: { kind: "text", limit: "cardDescription", required: true },
      note: { kind: "text", limit: "richParagraph" },
    }),
    audience: editable(true, "fixed", {
      body: { kind: "text", limit: "cardDescription", required: true },
    }),
    format: unmodeled(
      "Nema posebne format sekcije u renderovanoj stranici — online/uživo info je deo details teksta.",
    ),
    status: unmodeled(
      "Status enum vrednost pokreće prikaz, ali vidljiv tekst je deljena globalna poruka — nema dokazanog autorskog polja.",
    ),
    facilitators: unmodeled(
      "GroupProgram tip eksplicitno nema facilitator polje.",
    ),
    faq: unmodeled("Nema FAQ podataka vezanih za programe."),
    registration: unmodeled(
      "GroupProgram tip nema registration podatke — aside prikazuje samo hardkodovanu globalnu poruku.",
    ),
  },

  company_page: {
    hero: editable(true, "fixed", {
      title: { kind: "text", limit: "pageH1", required: true },
      lead: { kind: "text", limit: "heroLead" },
    }),
    support_types: editable(true, "fixed", {
      items: {
        kind: "repeater",
        min: 0,
        max: 6,
        item: {
          title: { kind: "text", limit: "cardTitle", required: true },
          description: {
            kind: "text",
            limit: "cardDescription",
            required: true,
          },
        },
      },
    }),
    plans: editable(true, "fixed", {
      items: {
        kind: "repeater",
        min: 0,
        max: 8,
        item: {
          title: { kind: "text", limit: "cardTitle", required: true },
          description: {
            kind: "text",
            limit: "cardDescription",
            required: true,
          },
        },
      },
    }),
    privacy: editable(true, "fixed", {
      title: { kind: "text", limit: "cardTitle" },
      description: { kind: "text", limit: "cardDescription" },
    }),
    configurator_cta: editable(true, "fixed", {
      primary: {
        kind: "cta",
        allowedActions: ["OPEN_COMPANY_CONFIGURATOR"],
        required: true,
      },
      bannerHeading: { kind: "text", limit: "cardTitle" },
      bannerBody: { kind: "text", limit: "cardDescription" },
    }),
    faq: editable(false, "toggleable", { items: faqItems }),
  },

  pricing_page: {
    service_prices: computed(
      "Mapira direktno preko serviceCatalog (naziv/trajanje/cena/format) — nema sopstvenih autorskih podataka.",
    ),
    packages: editable(true, "fixed", { items: packageItems }),
    notice: editable(false, "fixed", {
      body: { kind: "text", limit: "richParagraph" },
    }),
    cta: editable(true, "fixed", {
      primary: {
        kind: "cta",
        allowedActions: ["BOOK_SERVICE"],
        targetType: "service",
        required: true,
      },
    }),
    program_references: computed(
      "Mapira direktno preko groupPrograms — nema autorskih podataka.",
    ),
  },

  static_information: {
    hero: editable(true, "fixed", {
      h1: { kind: "text", limit: "pageH1", required: true },
      heroLead: { kind: "text", limit: "heroLead" },
    }),
    intro: unmodeled(
      "Nijedna static_information stranica nema intro textField u static-provider-u — čist JSX, nedokazano.",
    ),
    prose: unmodeled("Isto — nema strukturiranih podataka za prose, čist JSX."),
    cta: editable(false, "toggleable", {
      // Generic informational pages, not a single detail entity — restricted
      // to site-wide/marketing actions, excluding entity-targeted ones
      // (BOOK_THERAPIST, VIEW_PROGRAM…) that belong to a specific detail page.
      items: {
        kind: "ctaList",
        min: 0,
        max: 3,
        allowedActions: [
          "START_MATCHING",
          "BOOK_SERVICE",
          "OPEN_COMPANY_CONFIGURATOR",
          "VIEW_PRICING",
          "GENERAL_CONTACT",
        ],
      },
    }),
    faq: editable(false, "toggleable", { items: faqItems }),
  },

  // The real authoring surface for legal_page content is the separate legal
  // document registry (modules/privacy, LD-7/screen-dokumenti.tsx) — this
  // registry entry exists so a `ContentEntry` on this template stays typed
  // correctly if one is ever created through modules/content generically,
  // mirroring the already-shipped LegalDocumentRevision shape rather than
  // inventing a second one.
  legal_page: {
    title: editable(true, "fixed", {
      title: { kind: "text", limit: "pageH1", required: true },
    }),
    legal_copy: editable(true, "fixed", {
      body: { kind: "rich", maxBlocks: 500, required: true },
    }),
    version: editable(true, "fixed", {
      versionLabel: { kind: "text", limit: "shortFact", required: true },
    }),
    links: unmodeled(
      "LegalDocumentPage komponenta ne renderuje links sekciju — nema dokaza o obliku.",
    ),
  },
};
