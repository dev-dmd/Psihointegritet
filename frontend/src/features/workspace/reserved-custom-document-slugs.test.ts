import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RESERVED_CUSTOM_DOCUMENT_SLUGS } from "./reserved-custom-document-slugs";

interface ReservedSlugFixture {
  fixtureSchemaVersion: string;
  slugs: string[];
}

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/fixtures/reserved-custom-document-slugs.v1.json",
);
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf-8"),
) as ReservedSlugFixture;

describe(`reserved custom-document slug parity (schema v${fixture.fixtureSchemaVersion})`, () => {
  it("matches the shared frontend/backend fixture exactly", () => {
    expect([...RESERVED_CUSTOM_DOCUMENT_SLUGS].sort()).toEqual(
      [...fixture.slugs].sort(),
    );
  });

  it("reserves the Kompas landing-page slug", () => {
    expect(RESERVED_CUSTOM_DOCUMENT_SLUGS).toContain("kompas");
  });
});
