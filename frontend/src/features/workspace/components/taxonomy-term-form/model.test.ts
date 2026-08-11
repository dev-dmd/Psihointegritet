import { describe, expect, it } from "vitest";

import type { TaxonomyTerm } from "../../taxonomy-api";
import { contentCharacterLimits } from "@/lib/content-governance/limits";
import {
  buildTaxonomyTermSavePayload,
  createTaxonomyTermDraft,
  parseTaxonomySearchTerms,
  suggestTaxonomyStableId,
  taxonomySeoWarnings,
  validateTaxonomyTermDraft,
} from "./model";

function makeTerm(overrides: Partial<TaxonomyTerm> = {}): TaxonomyTerm {
  return {
    axis: "topic_group",
    canonicalPath: null,
    compassEnabled: true,
    createdAt: "2026-08-01T10:00:00Z",
    decisions: [],
    events: [],
    locale: "sr-Latn",
    lockVersion: 3,
    organizationId: null,
    publicLabel: "Stres i preopterećenost",
    publicVisible: true,
    relations: [],
    revisionId: "revision-1",
    searchTerms: [],
    shortDescription: "Kratak opis oblasti.",
    sortOrder: 0,
    stableId: "stres-i-preopterecenost",
    status: "draft",
    systemDefined: false,
    termId: "term-1",
    updatedAt: "2026-08-01T10:00:00Z",
    versionLabel: "v1",
    ...overrides,
  };
}

describe("taxonomy term form model", () => {
  it("suggests an editable ASCII stable ID from Serbian Latin text", () => {
    expect(suggestTaxonomyStableId("  Đački stres i iščekivanje  ")).toBe(
      "djacki-stres-i-iscekivanje",
    );
  });

  it("normalizes search terms without losing the first public spelling", () => {
    expect(
      parseTaxonomySearchTerms(" Sagorevanje, sagorevanje\n iscrpljenost "),
    ).toEqual(["Sagorevanje", "iscrpljenost"]);
  });

  it("allows the identity POST for an incomplete topic DRAFT", () => {
    const draft = {
      ...createTaxonomyTermDraft(null),
      stableId: "sagorevanje",
      publicLabel: "Sagorevanje",
      shortDescription: "Početni opis teme.",
      searchTermsText: "burnout, burnout\niscrpljenost",
    };

    expect(
      validateTaxonomyTermDraft("topic", draft, {
        hasPersistedTerm: false,
        scope: "identity",
      }),
    ).toBeNull();
    const payload = buildTaxonomyTermSavePayload({
      axis: "topic",
      draft,
      term: null,
    });

    expect(payload.update).toBeNull();
    expect(payload.create).toMatchObject({
      axis: "topic",
      stableId: "sagorevanje",
      primaryParentTermId: null,
      journeyIntentTermId: null,
      searchTerms: ["burnout", "iscrpljenost"],
    });
  });

  it("keeps stable identity out of the shared update payload", () => {
    const term = makeTerm();
    const draft = {
      ...createTaxonomyTermDraft(term),
      stableId: "pokusaj-promene",
      publicLabel: "Izmenjen naziv",
      visualMode: "asset" as const,
      assetId: "asset-1",
      iconKey: "ignored-icon",
    };
    const payload = buildTaxonomyTermSavePayload({
      axis: "topic_group",
      draft,
      term,
    });

    expect(payload.create).toBeNull();
    expect(payload.update).toMatchObject({
      termId: term.termId,
      revisionId: term.revisionId,
      input: {
        lockVersion: 3,
        publicLabel: "Izmenjen naziv",
        assetId: "asset-1",
        iconKey: null,
      },
    });
    expect(payload.update?.input).not.toHaveProperty("stableId");
    expect(payload.update?.input).not.toHaveProperty("axis");
  });

  it("returns field-scoped validation in the same order for both editors", () => {
    const topicDraft = {
      ...createTaxonomyTermDraft(null),
      stableId: "tema",
      publicLabel: "Tema",
      shortDescription: "Opis",
    };
    expect(
      validateTaxonomyTermDraft("topic", topicDraft, {
        hasPersistedTerm: false,
        scope: "complete",
      }),
    ).toEqual({
      field: "primaryParentTermId",
      message: "Izaberite oblast kojoj tema pripada.",
    });
  });

  it("reports SEO limits as non-blocking warnings without truncation", () => {
    const publicLabel = "N".repeat(66);
    const limit = contentCharacterLimits.seoDescription;
    const shortDescription = "O".repeat(limit + 1);
    const warnings = taxonomySeoWarnings({ publicLabel, shortDescription });

    expect(warnings.publicLabel).toContain("65");
    expect(warnings.shortDescription).toContain(String(limit));
    expect(publicLabel).toHaveLength(66);
    // The warning must not truncate — the author keeps what they typed.
    expect(shortDescription).toHaveLength(limit + 1);
    expect(
      taxonomySeoWarnings({
        publicLabel: "N".repeat(65),
        shortDescription: "O".repeat(limit),
      }),
    ).toEqual({ publicLabel: null, shortDescription: null });
  });
});
