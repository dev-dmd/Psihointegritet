import { describe, expect, it } from "vitest";

import {
  DISPLAY_ORDER_PRESETS,
  displayOrderPreset,
  TAXONOMY_KIND_COPY,
} from "./taxonomy-copy";

describe("display order presented as a choice instead of a number", () => {
  it("classifies each preset back into itself, so a saved term reopens on the button the author pressed", () => {
    for (const preset of DISPLAY_ORDER_PRESETS) {
      expect(displayOrderPreset(preset.value)).toBe(preset.id);
    }
  });

  it("keeps the wire value an integer the registry already accepts", () => {
    const values = DISPLAY_ORDER_PRESETS.map((preset) => preset.value);
    expect(values.every((value) => Number.isInteger(value) && value >= 0)).toBe(
      true,
    );
    // Spaced on purpose: a manual override still fits between two presets
    // without landing on one of them.
    expect(new Set(values).size).toBe(values.length);
  });

  it("classifies a number nobody chose through the UI", () => {
    // Terms created before the presets existed, or through the advanced
    // editor, carry arbitrary values. They must still open on some button.
    expect(displayOrderPreset(0)).toBe("early");
    expect(displayOrderPreset(37)).toBe("normal");
    expect(displayOrderPreset(100_000)).toBe("late");
  });

  it("puts the boundaries on the side the label promises", () => {
    expect(displayOrderPreset(29)).toBe("early");
    expect(displayOrderPreset(30)).toBe("normal");
    expect(displayOrderPreset(70)).toBe("normal");
    expect(displayOrderPreset(71)).toBe("late");
  });
});

describe("what each registry is, said once", () => {
  it("gives every launcher card a title, a description and an example", () => {
    for (const copy of Object.values(TAXONOMY_KIND_COPY)) {
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.description.length).toBeGreaterThan(0);
      expect(copy.example.length).toBeGreaterThan(0);
    }
  });

  it("never says axis, ID or any other word from the wire format (D-062)", () => {
    const sentences = Object.values(TAXONOMY_KIND_COPY)
      .flatMap((copy) => [copy.title, copy.description, copy.example])
      .join(" ")
      .toLowerCase();
    for (const forbidden of ["axis", "osa", "stable", "id", "uuid", "api"]) {
      expect(sentences).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
    }
  });
});
