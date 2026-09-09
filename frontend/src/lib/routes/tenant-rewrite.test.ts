import { describe, expect, it } from "vitest";

import { SIGN_IN_PATH, SIGN_UP_PATH } from "./auth-paths";
import {
  isInternalOnlyPath,
  reservedFirstSegments,
  servedFromTenantSegment,
  tenantPathPrefix,
} from "./tenant-rewrite";
import { TENANT_DOMAINS } from "@/lib/tenant/domain-registry";

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

describe("naming a tenant in the path", () => {
  it("keeps every registered tenant addressable as a path prefix", () => {
    // The invariant that makes the reserved list safe to derive: if a platform
    // route root ever collided with a tenant slug, that tenant would silently
    // become unreachable outside production. Asserted over the registry rather
    // than over a list, so a new tenant is covered the day it is added.
    const reserved = new Set(reservedFirstSegments());
    for (const tenant of TENANT_DOMAINS) {
      expect(reserved.has(tenant.organizationSlug)).toBe(false);
      expect(
        tenantPathPrefix(`/${tenant.organizationSlug}/nalog`)?.tenant
          .organizationSlug,
      ).toBe(tenant.organizationSlug);
    }
  });

  it("derives the reserved segments instead of listing them", () => {
    const reserved = reservedFirstSegments();
    // Every platform surface, in both spellings, plus the auth paths and the
    // two internal trees. None of these is written down here twice.
    for (const segment of [
      "radni-prostor",
      "workspace",
      "nalog",
      "account",
      "superadmin",
      "prijava",
      "registracija",
      "nova-lozinka",
      "pristup-odbijen",
      "api",
      "s",
      "platform-home",
    ]) {
      expect(reserved).toContain(segment);
    }
  });

  it("refuses to read a tenant out of a segment the platform owns", () => {
    for (const path of [
      "/nalog",
      "/nalog/termini",
      "/radni-prostor",
      "/api/me",
      "/prijava",
      "/s/sanja-neuer",
    ]) {
      expect(tenantPathPrefix(path)).toBeNull();
    }
  });

  it("refuses a slug nobody registered", () => {
    // Naming a tenant is not being one — the same rule `resolveHostBinding`
    // applies to a hostname. The request continues as a platform path and meets
    // the ordinary refusal rather than becoming a blank tenant.
    expect(tenantPathPrefix("/ne-postoji")).toBeNull();
    expect(tenantPathPrefix("/ne-postoji/usluge")).toBeNull();
  });

  it("splits the prefix from what is left, and calls a bare slug the root", () => {
    expect(tenantPathPrefix("/sanja-neuer")).toEqual({
      tenant: expect.objectContaining({ organizationSlug: "sanja-neuer" }),
      prefix: "/sanja-neuer",
      path: "/",
    });
    expect(tenantPathPrefix("/sanja-neuer/")?.path).toBe("/");
    expect(tenantPathPrefix("/sanja-neuer/usluge")?.path).toBe("/usluge");
    expect(tenantPathPrefix("/psihointegritet/tim/ana")?.path).toBe("/tim/ana");
  });

  it("matches whole segments, so a lookalike slug is nobody", () => {
    expect(tenantPathPrefix("/sanja-neuerx/usluge")).toBeNull();
    expect(tenantPathPrefix("/sanja")).toBeNull();
  });

  it("keeps the internal trees unreachable as addresses", () => {
    for (const path of ["/s", "/s/", "/s/sanja-neuer", "/platform-home"]) {
      expect(isInternalOnlyPath(path)).toBe(true);
    }
    for (const path of ["/", "/usluge", "/superadmin", "/sanja-neuer"]) {
      expect(isInternalOnlyPath(path)).toBe(false);
    }
  });

  it("does not treat a query string as part of the segment", () => {
    // The defect this guards: a path carrying `?tab=x` stopped matching the
    // client-area prefix, so `/account?tab=x` was rewritten onto a tenant
    // segment where nothing exists. The proxy now keeps the query to itself.
    expect(servedFromTenantSegment("/account", own)).toBe(false);
    expect(servedFromTenantSegment("/nalog", own)).toBe(false);
  });
});
