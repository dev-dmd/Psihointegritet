import { describe, expect, it } from "vitest";

import {
  articleSlugIssue,
  articleSlugTaken,
  suggestArticleSlug,
} from "./article-identity";
import { RESERVED_ARTICLE_SLUGS } from "./reserved-article-slugs";

describe("the address an article gets from its title", () => {
  it("folds Serbian diacritics the way the backend pattern requires", () => {
    expect(suggestArticleSlug("Anksioznost nije vaš neprijatelj")).toBe(
      "anksioznost-nije-vas-neprijatelj",
    );
    expect(suggestArticleSlug("Šta je đačka trema?")).toBe(
      "sta-je-djacka-trema",
    );
    expect(suggestArticleSlug("  Dvostruki   razmaci  ")).toBe(
      "dvostruki-razmaci",
    );
  });

  it("never emits a leading, trailing or doubled hyphen", () => {
    for (const title of ["— Naslov —", "A???B", "!!!", "kraj…"]) {
      const slug = suggestArticleSlug(title);
      expect(slug).not.toMatch(/^-|-$|--/);
    }
  });

  it("explains a title that cannot become an address instead of failing at the server", () => {
    expect(articleSlugIssue("   ")).toContain("Unesite naslov");
    // Cyrillic survives no transformation the pattern accepts.
    expect(articleSlugIssue("Анксиозност")).toContain("latinicom");
    expect(articleSlugIssue("Anksioznost")).toBeNull();
  });

  it("refuses a slug reserved for a future /znanje page, and names it", () => {
    for (const reserved of RESERVED_ARTICLE_SLUGS) {
      const issue = articleSlugIssue(reserved);
      expect(issue).toContain(reserved);
      expect(issue).toContain("rezervisana");
    }
  });

  it("sees a slug this tenant already used, without asking the server first", () => {
    const existing = [
      { contentType: "article", slug: "anksioznost" },
      { contentType: "static_page", slug: "o-nama" },
    ];
    expect(articleSlugTaken("anksioznost", existing)).toBe(true);
    // Same slug under another type is a different public route, not a clash.
    expect(articleSlugTaken("o-nama", existing)).toBe(false);
    expect(articleSlugTaken("nesanica", existing)).toBe(false);
  });
});
