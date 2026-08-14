import { describe, expect, it } from "vitest";

import { SUPPORTED_UI_LOCALES, type UiLocale } from "@/i18n/locales";

import { getPlatformMessages } from ".";

type Leaf = { path: string; value: string };

function leaves(node: unknown, prefix = ""): Leaf[] {
  if (typeof node === "string") return [{ path: prefix, value: node }];
  if (node === null || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, child]) =>
    leaves(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

const CATALOGUES = Object.fromEntries(
  SUPPORTED_UI_LOCALES.map((locale) => [locale, getPlatformMessages(locale)]),
) as Record<UiLocale, ReturnType<typeof getPlatformMessages>>;

const KEYS = Object.fromEntries(
  SUPPORTED_UI_LOCALES.map((locale) => [
    locale,
    leaves(CATALOGUES[locale]).map((leaf) => leaf.path),
  ]),
) as Record<UiLocale, string[]>;

describe("catalogue parity", () => {
  // A missing or unknown key is already a compile error via the `Widen<>`
  // annotation. These assertions cover what the type system cannot see, and
  // they are the reason the CI script exists rather than trusting review.
  it("has identical key sets in every locale", () => {
    const english = [...KEYS.en].sort();
    for (const locale of SUPPORTED_UI_LOCALES) {
      expect([...KEYS[locale]].sort(), `locale ${locale}`).toEqual(english);
    }
  });

  it("has no empty values", () => {
    for (const locale of SUPPORTED_UI_LOCALES) {
      for (const leaf of leaves(CATALOGUES[locale])) {
        expect(leaf.value.trim(), `${locale}:${leaf.path}`).not.toBe("");
      }
    }
  });

  it("has matching ICU placeholders across locales", () => {
    // `{count}` present in English and dropped in Serbian renders a sentence
    // with a hole in it — invisible to the type system, obvious to a user.
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();

    for (const leaf of leaves(CATALOGUES.en)) {
      for (const locale of SUPPORTED_UI_LOCALES) {
        const translated = leaves(CATALOGUES[locale]).find(
          (candidate) => candidate.path === leaf.path,
        );
        expect(
          placeholders(translated?.value ?? ""),
          `${locale}:${leaf.path}`,
        ).toEqual(placeholders(leaf.value));
      }
    }
  });

  /**
   * Keys whose value is deliberately the same in every locale.
   *
   * Every entry is a **proper noun** — a product, brand or feature name that is
   * not translated anywhere, including in Serbian prose. Adding to this list is
   * a deliberate act and needs a reason next to it, because the check it
   * suppresses is the one that catches a namespace copied across and never
   * translated.
   */
  const PROPER_NOUNS = new Set([
    "workspace.brand.name", // the centre's own name
    "public.footer.organizationGroup", // the centre's own name
    "workspace.brand.panel", // "Control Center" — product name, used as-is in Serbian
    "workspace.superadmin.panel", // ditto
    "workspace.superadmin.nav.features", // "Feature Gates" — platform term, not translated
    "workspace.superadmin.nav.featuresShort", // the same term, shortened for mobile
    "workspace.superadmin.nav.auditLog", // "Audit Log" — ditto
    "superadmin.comingSoon.auditLog.title", // the same feature name
    "content.counted", // pure ICU interpolation, no words of its own
    // Two placeholders and the word "completion", which the Serbian panel copy
    // already used untranslated before the extraction.
    "screens.overview.surveyProgress",
    // Pure ICU interpolation — the greeting itself is a separate key, so these
    // two patterns hold no words of their own, only punctuation.
    "account.home.greeting",
    "account.home.greetingPlain",
    "account.format.online", // the Serbian panel says „Online" too
    "public.pages.companies.plans.teamFlex.title", // product/model name
    "public.pages.companyConfigurator.options.size.between20And50", // numeric range
    "public.pages.companyConfigurator.options.size.between50And200", // numeric range
    "public.pages.companyConfigurator.options.topic.burnout", // established loanword in the approved Serbian copy
  ]);

  it("does not leave Serbian values identical to English", () => {
    // The signature of a namespace copied across and never translated.
    const english = new Map(
      leaves(CATALOGUES.en).map((l) => [l.path, l.value]),
    );
    const untranslated = leaves(CATALOGUES["sr-Latn"]).filter(
      (leaf) =>
        english.get(leaf.path) === leaf.value && !PROPER_NOUNS.has(leaf.path),
    );
    expect(untranslated.map((leaf) => leaf.path)).toEqual([]);
  });

  it("keeps the proper-noun allowlist honest", () => {
    // An entry that no longer matches is either a fixed translation or a stale
    // exemption; both should be removed rather than left to hide a future one.
    const english = new Map(
      leaves(CATALOGUES.en).map((l) => [l.path, l.value]),
    );
    const serbian = new Map(
      leaves(CATALOGUES["sr-Latn"]).map((l) => [l.path, l.value]),
    );
    for (const path of PROPER_NOUNS) {
      expect(
        english.get(path),
        `${path} is not in the catalogue`,
      ).toBeDefined();
      expect(serbian.get(path), `${path} no longer needs an exemption`).toBe(
        english.get(path),
      );
    }
  });

  it("uses semantic keys, never the English sentence", () => {
    // `common.actions.save`, not `common.Save`. A sentence-shaped key rots the
    // moment the copy changes.
    for (const path of KEYS.en) {
      for (const segment of path.split(".")) {
        expect(segment, `key segment "${segment}" in ${path}`).toMatch(
          /^[a-z][A-Za-z0-9]*$/,
        );
      }
    }
  });
});

describe("getPlatformMessages", () => {
  it("returns a catalogue for every supported locale", () => {
    for (const locale of SUPPORTED_UI_LOCALES) {
      expect(Object.keys(CATALOGUES[locale]).length).toBeGreaterThan(0);
    }
  });

  it("returns the Serbian catalogue for the live tenant's locale", () => {
    expect(getPlatformMessages("sr-Latn").common.actions.save).toBe("Sačuvaj");
    expect(getPlatformMessages("en").common.actions.save).toBe("Save");
  });
});
