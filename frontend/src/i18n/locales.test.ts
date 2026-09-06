import { describe, expect, it } from "vitest";

import {
  HTML_LANG_BY_LOCALE,
  LOCALE_ENDONYMS,
  PLATFORM_DEFAULT_LOCALE,
  SUPPORTED_UI_LOCALES,
  isUiLocale,
} from "./locales";

describe("platform locale vocabulary", () => {
  it("defaults new organizations to English (D-077 supersedes T9)", () => {
    expect(PLATFORM_DEFAULT_LOCALE).toBe("en");
    expect(SUPPORTED_UI_LOCALES).toContain(PLATFORM_DEFAULT_LOCALE);
  });

  it("supports exactly the two locales the CHECK constraint allows", () => {
    // Kept in step with `ck_organizations_ui_locale_supported`. Widening this
    // array without the matching backend migration produces an organization
    // the frontend renders and the database refuses to store.
    expect([...SUPPORTED_UI_LOCALES]).toEqual(["en", "sr-Latn"]);
  });

  it("gives every locale an html lang and an endonym", () => {
    for (const locale of SUPPORTED_UI_LOCALES) {
      expect(HTML_LANG_BY_LOCALE[locale]).toBeTruthy();
      expect(LOCALE_ENDONYMS[locale]).toBeTruthy();
    }
  });

  describe("isUiLocale", () => {
    it("accepts supported locales", () => {
      expect(isUiLocale("en")).toBe(true);
      expect(isUiLocale("sr-Latn")).toBe(true);
    });

    it("rejects near-misses that a hand-typed env var would produce", () => {
      // `sr` and `sr-RS` are the two values most likely to be typed by hand or
      // copied from an Intl call; neither is a platform locale.
      for (const value of ["sr", "sr-RS", "sr-latn", "SR-LATN", "en-US"]) {
        expect(isUiLocale(value)).toBe(false);
      }
    });

    it("rejects non-strings without throwing", () => {
      for (const value of [undefined, null, 42, {}, ["en"]]) {
        expect(isUiLocale(value)).toBe(false);
      }
    });
  });
});
