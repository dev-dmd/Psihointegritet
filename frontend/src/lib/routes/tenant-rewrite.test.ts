import { describe, expect, it } from "vitest";

import { SIGN_IN_PATH, SIGN_UP_PATH } from "./auth-paths";
import { servedFromTenantSegment } from "./tenant-rewrite";

/** A tenant whose pages live under `app/s/[organizationSlug]` — Sanja today. */
const own = {};
/** The founding tenant, whose ~26 public pages have not moved yet. */
const legacy = { usesLegacyPublicTree: true };

describe("what a tenant host rewrites onto the tenant segment", () => {
  it("leaves the auth pages where they are", () => {
    // The regression this file exists for. `/prijava`, `/registracija`,
    // `/nova-lozinka` and `/pristup-odbijen` are top-level files — there is no
    // `app/s/[organizationSlug]/prijava` — so rewriting them produced a 404
    // that read as a missing page rather than a routing bug. It answered 404 on
    // `sanja-neuer.vercel.app` while working on `psihointegritet.com`, because
    // the legacy tree exempted that host from rewriting at all.
    for (const path of [
      SIGN_IN_PATH,
      SIGN_UP_PATH,
      "/nova-lozinka",
      "/pristup-odbijen",
      "/prijava/nesto",
    ]) {
      expect(servedFromTenantSegment(path, own)).toBe(false);
    }
  });

  it("leaves every Route Handler where it is", () => {
    // Worse than the sign-in page and found with it: a tenant's own site posts
    // to these. Rewritten, booking, intake and sign-out all answer 404 on that
    // tenant's domain and nowhere else.
    for (const path of [
      "/api/auth/sign-in",
      "/api/auth/sign-out",
      "/api/booking/appointment-requests",
      "/api/me",
    ]) {
      expect(servedFromTenantSegment(path, own)).toBe(false);
    }
  });

  it("leaves the client area where it is, scoped by the stamp", () => {
    for (const path of ["/nalog", "/account", "/nalog/termini"]) {
      expect(servedFromTenantSegment(path, own)).toBe(false);
    }
  });

  it("rewrites a tenant's own public pages", () => {
    for (const path of ["/", "/usluge", "/o-meni", "/blog/nesto"]) {
      expect(servedFromTenantSegment(path, own)).toBe(true);
    }
  });

  it("rewrites nothing for the tenant whose tree has not moved yet", () => {
    // Why the bug stayed hidden: with `usesLegacyPublicTree` set, *nothing* on
    // that host is rewritten, so the missing rule never showed. The first
    // tenant without it was the first tenant to lose its sign-in page.
    for (const path of ["/", "/usluge", SIGN_IN_PATH, "/api/me", "/nalog"]) {
      expect(servedFromTenantSegment(path, legacy)).toBe(false);
    }
  });

  it("does not treat a lookalike prefix as a whole segment", () => {
    // `/prijavljivanje` is not under `/prijava`, and must reach the tenant's
    // own page rather than the auth exemption.
    expect(servedFromTenantSegment("/prijavljivanje", own)).toBe(true);
    expect(servedFromTenantSegment("/nalogodavac", own)).toBe(true);
  });
});
