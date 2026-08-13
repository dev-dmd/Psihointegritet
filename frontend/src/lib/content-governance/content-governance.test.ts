import { describe, expect, it } from "vitest";

import { resolveCtaHref } from "./cta";
import {
  createPageMetadata,
  robotsPolicy,
  sitemapEntries,
} from "./discoverability";
import { createContentHealthReport } from "./health";
import {
  isKnownPublicRoute,
  redirectRegistry,
  staticContentEntities,
  staticContentProvider,
  staticContentProviderForLocale,
} from "./static-provider";
import type { ContentEntity } from "./types";
import {
  isSitemapEligible,
  isValidPublicationTransition,
  validateEntity,
  validateRedirectRegistry,
} from "./validation";

const context = {
  provider: staticContentProvider,
  isKnownPublicRoute,
};

function entity(id: string): ContentEntity {
  const found = staticContentProvider.getEntityById(id);
  if (!found) throw new Error(`Missing fixture ${id}`);
  return found;
}

describe("content governance contract", () => {
  it("builds localized fallback providers with stable entity identities", () => {
    const english = staticContentProviderForLocale("en").getEntity(
      "service",
      "service:individualna-psihoterapija",
    );
    const serbian = staticContentProviderForLocale("sr-Latn").getEntity(
      "service",
      "service:individualna-psihoterapija",
    );

    expect(english?.source.slug).toBe(serbian?.source.slug);
    expect(english?.source.name).toBe("Individual psychotherapy");
    expect(serbian?.source.name).toBe("Individualna psihoterapija");
  });

  it.each(["/kompas/oblast/stres-i-preopterecenost", "/kompas/tema/burnout"])(
    "recognizes the canonical Kompas taxonomy route %s",
    (path) => {
      expect(isKnownPublicRoute(path)).toBe(true);
    },
  );

  it.each([
    "/kompas/oblast",
    "/kompas/oblast/",
    "/kompas/tema",
    "/kompas/tema/",
    "/kompas/oblast/stres/dodatno",
    "/kompas/tema/burnout/dodatno",
    "/kompas-oblast/stres",
    "/kompas/oblasti/stres",
    "/kompas-tema/burnout",
    "/kompas/teme/burnout",
  ])("rejects a malformed or lookalike Kompas taxonomy route %s", (path) => {
    expect(isKnownPublicRoute(path)).toBe(false);
  });

  it("registers the Kompas landing page now that its renderer exists", () => {
    // Flipped deliberately: this guard held while `/kompas` had no page file.
    // `app/(public)/kompas/page.tsx` now renders the hero and the starting
    // view, so registering the route no longer points at a 404.
    expect(isKnownPublicRoute("/kompas")).toBe(true);
  });

  it("keeps the canonical taxonomy patterns registered", () => {
    // ⚠️ These two are registered but have no page file yet — they land with
    // K3B. Until then `isKnownPublicRoute` is true for a URL that 404s, which
    // is exactly what the `/kompas` guard above used to prevent. This test
    // documents the gap rather than hiding it.
    expect(isKnownPublicRoute("/kompas/oblast/anksioznost")).toBe(true);
    expect(isKnownPublicRoute("/kompas/tema/napadi-panike")).toBe(true);
  });

  it("allows only the locked publication lifecycle transitions", () => {
    expect(isValidPublicationTransition("draft", "in_review")).toBe(true);
    expect(isValidPublicationTransition("in_review", "approved")).toBe(true);
    expect(isValidPublicationTransition("approved", "published")).toBe(true);
    expect(isValidPublicationTransition("published", "archived")).toBe(true);
    expect(isValidPublicationTransition("archived", "draft")).toBe(true);
    expect(isValidPublicationTransition("draft", "published")).toBe(false);
    expect(isValidPublicationTransition("published", "draft")).toBe(false);
  });

  it("generates only registry-controlled CTA destinations", () => {
    expect(
      resolveCtaHref(
        {
          label: "Zakaži termin",
          action: "BOOK_SERVICE",
          targetId: "service:individualna-psihoterapija",
        },
        staticContentProvider,
      ),
    ).toBe("/zakazi?service=individualna-psihoterapija");
    expect(
      resolveCtaHref(
        {
          label: "Neispravno",
          action: "BOOK_SERVICE",
          targetId: "therapist:maria-bullock",
        },
        staticContentProvider,
      ),
    ).toBeNull();
  });

  it("keeps pre-launch public content out of indexing", () => {
    const page = entity("page:home");
    expect(isSitemapEligible(page, context)).toBe(false);
    expect(createPageMetadata(page, "staging").robots).toEqual({
      index: false,
      follow: false,
    });
    expect(
      robotsPolicy(new URL("https://example.test"), "staging").rules,
    ).toEqual({
      userAgent: "*",
      disallow: "/",
    });
    expect(
      sitemapEntries(
        staticContentProvider,
        new URL("https://example.test"),
        "staging",
      ),
    ).toEqual([]);
  });

  it("rejects invalid booking mode and missing published approvals", () => {
    const service = entity("service:individualna-psihoterapija");
    const invalid = {
      ...service,
      publicationStatus: "published" as const,
      bookingMode: "live",
    } as unknown as ContentEntity;
    const findings = validateEntity(invalid, context);
    expect(findings.map((finding) => finding.ruleId)).toContain("BOOK-001");
    expect(findings.map((finding) => finding.ruleId)).toContain("APP-002");
  });

  it("rejects overflowing content and redirect chains", () => {
    const page = entity("page:kontakt");
    const overflowing = {
      ...page,
      textFields: [
        ...page.textFields,
        { field: "h1", value: "x".repeat(81), limit: "pageH1" as const },
      ],
    } as ContentEntity;
    expect(
      validateEntity(overflowing, context).map((finding) => finding.ruleId),
    ).toContain("LIMIT-001");

    expect(
      validateRedirectRegistry(
        [
          {
            sourcePath: "/old-a",
            targetPath: "/old-b",
            status: 308,
            reason: "test",
          },
          {
            sourcePath: "/old-b",
            targetPath: "/zakazi",
            status: 308,
            reason: "test",
          },
        ],
        context,
      ).map((finding) => finding.ruleId),
    ).toContain("REDIRECT-002");
  });

  it("keeps the checked-in static provider free of blocking findings", () => {
    const report = createContentHealthReport(
      staticContentEntities,
      redirectRegistry,
      context,
      "2026-07-22T00:00:00.000Z",
    );
    expect(report.summary.error).toBe(0);
  });
});
