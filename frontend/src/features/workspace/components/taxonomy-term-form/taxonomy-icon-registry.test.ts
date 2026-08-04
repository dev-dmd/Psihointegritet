import { describe, expect, it } from "vitest";

import {
  findTaxonomyIcon,
  searchTaxonomyIcons,
  TAXONOMY_ICONS,
} from "./taxonomy-icon-registry";

describe("the curated set of marks a therapist can choose from", () => {
  it("stores a stable key per entry, because that key ends up in a revision", () => {
    const keys = TAXONOMY_ICONS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => /^[a-z][a-z0-9-]*$/.test(key))).toBe(true);
  });

  it("finds an entry by its stored key", () => {
    expect(findTaxonomyIcon("breathing")?.label).toBe("Disanje");
    expect(findTaxonomyIcon(null)).toBeNull();
    // A key from before the catalogue existed must not crash the editor.
    expect(findTaxonomyIcon("sparkles-legacy")).toBeNull();
  });

  it("is searched in Serbian, with or without diacritics", () => {
    expect(searchTaxonomyIcons("učenje").map((entry) => entry.key)).toContain(
      "learning",
    );
    expect(searchTaxonomyIcons("ucenje").map((entry) => entry.key)).toContain(
      "learning",
    );
    expect(searchTaxonomyIcons("RAZGOVOR").map((entry) => entry.key)).toContain(
      "conversation",
    );
  });

  it("returns the whole catalogue for an empty query and nothing for nonsense", () => {
    expect(searchTaxonomyIcons("  ")).toHaveLength(TAXONOMY_ICONS.length);
    expect(searchTaxonomyIcons("qwertz")).toHaveLength(0);
  });
});
