import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  slotSpecRegistry,
  type SlotFieldSpec,
  type SlotSpec,
} from "./slot-schema";
import type { ContentTemplate } from "./types";

/**
 * Parity loader (CG-C1a, ADR-017 Amendment 2, D-050): reads the SAME
 * physical fixture file as
 * backend/tests/unit/test_slot_schema_fixtures.py. Unlike the other parity
 * fixtures in this repository (function behaviour over varied inputs),
 * `slotSpecRegistry` and `SLOT_SPEC_REGISTRY` are static data — the fixture
 * is the registry itself, serialized once from the Python side. This loader
 * converts the hand-written TS registry into the same neutral JSON shape and
 * asserts it matches exactly; any drift between the two independently
 * authored registries fails here.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fieldToJson(spec: SlotFieldSpec): Record<string, any> {
  switch (spec.kind) {
    case "text":
      return {
        kind: "text",
        limit: spec.limit,
        required: spec.required ?? false,
      };
    case "rich":
      return {
        kind: "rich",
        maxBlocks: spec.maxBlocks,
        maxChars: spec.maxChars ?? null,
        required: spec.required ?? false,
      };
    case "integer":
      return {
        kind: "integer",
        min: spec.min,
        max: spec.max,
        step: spec.step ?? null,
        unit: spec.unit ?? null,
        required: spec.required ?? false,
      };
    case "money":
      return {
        kind: "money",
        currency: spec.currency,
        min: spec.min,
        max: spec.max,
        required: spec.required ?? false,
      };
    case "image":
      return { kind: "image", required: spec.required ?? false };
    case "imageList":
      return { kind: "imageList", min: spec.min, max: spec.max };
    case "cta":
      return {
        kind: "cta",
        allowedActions: [...spec.allowedActions],
        targetType: spec.targetType ?? null,
        required: spec.required ?? false,
      };
    case "ctaList":
      return {
        kind: "ctaList",
        min: spec.min,
        max: spec.max,
        allowedActions: [...spec.allowedActions],
        targetType: spec.targetType ?? null,
      };
    case "repeater": {
      const item: Record<string, unknown> = {};
      for (const [name, field] of Object.entries(spec.item)) {
        item[name] = fieldToJson(field);
      }
      return { kind: "repeater", min: spec.min, max: spec.max, item };
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function slotToJson(spec: SlotSpec): Record<string, any> {
  if (spec.editability === "editable") {
    const fields: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(spec.fields)) {
      fields[name] = fieldToJson(field);
    }
    return {
      editability: "editable",
      required: spec.required,
      visibility: spec.visibility,
      fields,
    };
  }
  return { editability: spec.editability, reason: spec.reason };
}

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/fixtures/slot-schema.v1.json",
);

interface FixtureFile {
  fixtureSchemaVersion: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: Record<string, Record<string, any>>;
}

// Repo-internal trusted file; the cast is the boundary adapter for JSON.parse.
const fixtures = JSON.parse(readFileSync(fixturePath, "utf-8")) as FixtureFile;

describe(`slot-schema parity fixture (schema v${fixtures.fixtureSchemaVersion})`, () => {
  it("loaded all nine templates", () => {
    expect(Object.keys(fixtures.templates)).toHaveLength(9);
  });

  it("TS registry matches the fixture exactly", () => {
    const actual: Record<string, unknown> = {};
    for (const [template, slots] of Object.entries(slotSpecRegistry) as [
      ContentTemplate,
      Record<string, SlotSpec>,
    ][]) {
      const slotsJson: Record<string, unknown> = {};
      for (const [slot, spec] of Object.entries(slots)) {
        slotsJson[slot] = slotToJson(spec);
      }
      actual[template] = slotsJson;
    }
    expect(actual).toEqual(fixtures.templates);
  });
});
