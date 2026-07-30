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
          targetId: "therapist:anja-stamenkovic",
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
