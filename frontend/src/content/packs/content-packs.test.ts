import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONTENT_PACK_IDS, type ContentPackId } from "../pack-types";
import {
  contentPackForOrganizationSlug,
  getContentPackForLocale,
} from "../registry";

const locales = ["en", "sr-Latn"] as const;

function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
}

describe("content packs", () => {
  it.each(CONTENT_PACK_IDS)("provides both locales for %s", (packId) => {
    for (const locale of locales) {
      const content = getContentPackForLocale(packId, locale);
      expect(content.metadata).toMatchObject({ packId, locale });
      expect(Object.keys(content.workspaceDemo).sort()).toEqual(
        Object.keys(
          getContentPackForLocale(packId, locale === "en" ? "sr-Latn" : "en")
            .workspaceDemo,
        ).sort(),
      );
    }
  });

  it("keeps the Psihointegritet source review states exact", () => {
    for (const locale of locales) {
      const content = getContentPackForLocale("psihointegritet", locale);
      expect(content.metadata.demoDataMode).toBe("showcase");
      expect(content.metadata.sourceStatus).toEqual({
        publicSite: "in_review",
        therapists: "in_review",
        services: "missing",
        companies: "missing",
        research: "missing",
        compass: "in_review",
        legal: "missing",
      });
      expect(Object.values(content.metadata.sourceStatus)).not.toContain(
        "approved",
      );
      expect(Object.values(content.metadata.sourceStatus)).not.toContain(
        "published",
      );
    }
  });

  it("ships neutral, bilingual starter copy without invented catalog data", () => {
    for (const locale of locales) {
      const content = getContentPackForLocale("mental-health-starter", locale);
      expect(content.metadata.demoDataMode).toBe("empty");
      expect(content.homepage.reasons).toHaveLength(3);
      expect(content.homepage.firstSessionSteps).toHaveLength(3);
      expect(content.homepage.faqItems).toHaveLength(2);
      expect(content.homepage.companies.title).not.toBe("");
      expect(content.services.PRICE_NOTE).not.toBe("");
      expect(content.services.serviceCatalog).toEqual([]);
      expect(content.services.sessionPackages).toEqual([]);
      expect(content.therapists).toEqual([]);
      expect(content.workspaceDemo.researchSurvey.responses).toBe(0);
    }
  });

  it("keeps blank editor guidance outside the empty public payload", () => {
    for (const locale of locales) {
      const content = getContentPackForLocale("blank", locale);
      const publicPayload = {
        homepage: content.homepage,
        services: content.services,
        therapists: content.therapists,
      };
      const guidance = stringsIn(content.metadata.editorGuidance);

      expect(content.metadata.demoDataMode).toBe("off");
      expect(stringsIn(publicPayload).filter(Boolean)).toEqual([]);
      for (const helpText of guidance) {
        expect(JSON.stringify(publicPayload)).not.toContain(helpText);
      }
    }
  });

  it("selects the production pack only through the verified C2(a) registry", () => {
    expect(contentPackForOrganizationSlug("psihointegritet")).toBe(
      "psihointegritet",
    );
    expect(contentPackForOrganizationSlug("psihointegritet-en")).toBe(
      "psihointegritet",
    );
    expect(() => contentPackForOrganizationSlug("unknown")).toThrow(
      /Unknown organization slug/,
    );
  });

  it("does not feed showcase research into the real research adapter", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/workspace/research-api.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /workspaceDemo|content\/registry|content\/packs/,
    );
  });

  it("recognizes only the three locked pack ids", () => {
    expect(CONTENT_PACK_IDS satisfies readonly ContentPackId[]).toEqual([
      "psihointegritet",
      "mental-health-starter",
      "blank",
    ]);
  });
});
