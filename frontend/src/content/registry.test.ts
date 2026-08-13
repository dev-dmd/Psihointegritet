import { describe, expect, it } from "vitest";

import { getFallbackContentForLocale } from "./registry";

describe("fallback content registry", () => {
  it("selects complete locale packages without module-scope environment reads", () => {
    const en = getFallbackContentForLocale("en");
    const sr = getFallbackContentForLocale("sr-Latn");

    expect(en.homepage.companies.title).toBe("Working with companies");
    expect(sr.homepage.companies.title).toBe("Rad sa kompanijama");
    expect(en.services.serviceCatalog[0]?.name).toBe(
      "Individual psychotherapy",
    );
    expect(sr.services.serviceCatalog[0]?.name).toBe(
      "Individualna psihoterapija",
    );
    expect(en.therapists[0]?.slug).toBe(sr.therapists[0]?.slug);
  });

  it("keeps stable identity fields equal across locale packages", () => {
    const en = getFallbackContentForLocale("en");
    const sr = getFallbackContentForLocale("sr-Latn");

    expect(en.services.serviceCatalog.map(({ slug }) => slug)).toEqual(
      sr.services.serviceCatalog.map(({ slug }) => slug),
    );
    expect(en.therapists.map(({ slug, image }) => ({ slug, image }))).toEqual(
      sr.therapists.map(({ slug, image }) => ({ slug, image })),
    );
  });
});
