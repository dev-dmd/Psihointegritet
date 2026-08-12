import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { RESERVED_ARTICLE_SLUGS } from "./reserved-article-slugs";

interface ReservedSlugFixture {
  fixtureSchemaVersion: string;
  slugs: string[];
}

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/fixtures/reserved-article-slugs.v1.json",
);
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf-8"),
) as ReservedSlugFixture;

describe(`reserved article slug parity (schema v${fixture.fixtureSchemaVersion})`, () => {
  it("matches the shared frontend/backend fixture exactly", () => {
    expect([...RESERVED_ARTICLE_SLUGS].sort()).toEqual(
      [...fixture.slugs].sort(),
    );
  });

  it("reserves the sibling pages a knowledge surface would need", () => {
    // Losing one of these to an article is only noticed the day that page
    // ships, long after the slug was typed.
    for (const slug of ["pretraga", "kategorije", "autori"]) {
      expect(RESERVED_ARTICLE_SLUGS).toContain(slug);
    }
  });
});
