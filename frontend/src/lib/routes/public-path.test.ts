import { describe, expect, it } from "vitest";

import {
  localizedPublicPath,
  localizePublicHref,
  matchPublicPath,
} from "./public-path";

describe("public localized paths", () => {
  it("builds English and Serbian paths with stable slugs and query values", () => {
    expect(
      localizedPublicPath("public.team.detail", {
        locale: "en",
        params: { slug: "maria-bullock" },
      }),
    ).toBe("/team/maria-bullock");
    expect(
      localizedPublicPath("public.book", {
        locale: "en",
        query: { source: "header" },
      }),
    ).toBe("/book?source=header");
    expect(
      localizedPublicPath("public.book", {
        locale: "sr-Latn",
        query: { source: "header" },
      }),
    ).toBe("/zakazi?source=header");
  });

  it("round-trips both external spellings", () => {
    expect(matchPublicPath("/team/maria-bullock")).toMatchObject({
      routeId: "public.team.detail",
      params: { slug: "maria-bullock" },
      pathLocale: "en",
    });
    expect(matchPublicPath("/tim/maria-bullock")).toMatchObject({
      routeId: "public.team.detail",
      params: { slug: "maria-bullock" },
      pathLocale: "sr-Latn",
    });
  });

  it("localizes legacy public hrefs without translating query codes", () => {
    expect(
      localizePublicHref(
        "/zakazi?service=individualna-psihoterapija&source=homepage",
        "en",
      ),
    ).toBe("/book?service=individualna-psihoterapija&source=homepage");
  });

  it("never converts an absolute external URL into a local route", () => {
    expect(localizePublicHref("https://example.com/tim/maria", "en")).toBe(
      "https://example.com/tim/maria",
    );
  });

  it("localizes the legal links exposed in the client account", () => {
    expect(localizedPublicPath("public.privacy", { locale: "en" })).toBe(
      "/privacy",
    );
    expect(
      localizedPublicPath("public.bookingRules", { locale: "sr-Latn" }),
    ).toBe("/pravila-zakazivanja");
    expect(localizePublicHref("/uslovi", "en")).toBe("/terms");
  });
});
