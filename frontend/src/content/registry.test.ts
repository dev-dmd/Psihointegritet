import { describe, expect, it } from "vitest";

import { getFallbackContentForLocale } from "./registry";

describe("fallback content registry", () => {
  it("selects complete locale packages without module-scope environment reads", () => {
    const en = getFallbackContentForLocale("en", "psihointegritet");
    const sr = getFallbackContentForLocale("sr-Latn", "psihointegritet");

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
    const en = getFallbackContentForLocale("en", "psihointegritet");
    const sr = getFallbackContentForLocale("sr-Latn", "psihointegritet");

    expect(Object.keys(en.workspaceDemo).sort()).toEqual(
      Object.keys(sr.workspaceDemo).sort(),
    );

    expect(en.services.serviceCatalog.map(({ slug }) => slug)).toEqual(
      sr.services.serviceCatalog.map(({ slug }) => slug),
    );
    expect(en.therapists.map(({ slug, image }) => ({ slug, image }))).toEqual(
      sr.therapists.map(({ slug, image }) => ({ slug, image })),
    );
    expect(
      en.workspaceDemo.appointmentRequests.map(({ id, status }) => ({
        id,
        status,
      })),
    ).toEqual(
      sr.workspaceDemo.appointmentRequests.map(({ id, status }) => ({
        id,
        status,
      })),
    );
    expect(en.workspaceDemo.clients.map(({ id }) => id)).toEqual(
      sr.workspaceDemo.clients.map(({ id }) => id),
    );
    expect(en.workspaceDemo.companies.map(({ id }) => id)).toEqual(
      sr.workspaceDemo.companies.map(({ id }) => id),
    );
    expect(en.workspaceDemo.serviceCatalog.map(({ code }) => code)).toEqual(
      sr.workspaceDemo.serviceCatalog.map(({ code }) => code),
    );
    expect(en.workspaceDemo.therapistCards.map(({ slug }) => slug)).toEqual(
      sr.workspaceDemo.therapistCards.map(({ slug }) => slug),
    );
  });
});
