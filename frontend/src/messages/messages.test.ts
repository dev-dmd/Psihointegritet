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

  it("does not leave Serbian values identical to English", () => {
    // The signature of a namespace copied across and never translated. Proper
    // nouns would need an allowlist; there are none in the catalogue today, and
    // adding one should be a deliberate act.
    const english = new Map(
      leaves(CATALOGUES.en).map((l) => [l.path, l.value]),
    );
    const untranslated = leaves(CATALOGUES["sr-Latn"]).filter(
      (leaf) => english.get(leaf.path) === leaf.value,
    );
    expect(untranslated.map((leaf) => leaf.path)).toEqual([]);
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
