import { describe, expect, it } from "vitest";

import { PUBLIC_ROUTES } from "./platform-routes";
import {
  hasRoutePrefix,
  isHostNeutralPath,
  isSurfaceAllowedOnHost,
} from "./match";

const tenantOnly = { isTenant: true, isPlatform: false };
const platformOnly = { isTenant: false, isPlatform: true };
/** The founding tenant's domain today: its own site *and* the workspace. */
const both = { isTenant: true, isPlatform: true };

describe("which host may serve which surface", () => {
  it("keeps owner surfaces off a tenant's domain", () => {
    // Sanja's clients must never be offered a workspace on her domain, and an
    // owner signing in there would be scoped by the address bar rather than by
    // their membership — which is the bug B2-1 closed.
    for (const path of ["/radni-prostor", "/workspace", "/superadmin"]) {
      expect(isSurfaceAllowedOnHost(path, tenantOnly)).toBe(false);
      expect(isSurfaceAllowedOnHost(path, platformOnly)).toBe(true);
    }
  });

  it("keeps the client area off a platform-only host", () => {
    // A client has no membership, so on a host that owns no tenant there is
    // nothing to scope them to — and the only remaining answer would be the
    // founding tenant, which is exactly the fallback D-080 forbids.
    for (const path of ["/nalog", "/account"]) {
      expect(isSurfaceAllowedOnHost(path, platformOnly)).toBe(false);
      expect(isSurfaceAllowedOnHost(path, tenantOnly)).toBe(true);
    }
  });

  it("serves both from a host that is genuinely both", () => {
    for (const path of ["/radni-prostor", "/nalog", "/usluge", "/"]) {
      expect(isSurfaceAllowedOnHost(path, both)).toBe(true);
    }
  });

  it("serves the public site from any host that owns a tenant", () => {
    expect(isSurfaceAllowedOnHost("/usluge", tenantOnly)).toBe(true);
    expect(isSurfaceAllowedOnHost("/", tenantOnly)).toBe(true);
  });

  it("never serves a tenant's public tree from a platform-only host", () => {
    // The regression this file exists for. `app/(public)` still holds the
    // founding tenant's pages, so a platform-only host that fell through to
    // them would put Psihointegritet's site on p-digital-center.com — the exact
    // identity D-080 retired.
    //
    // Asserted over the registry rather than over a handful of paths, so a page
    // added to the public tree cannot quietly widen what the platform serves.
    const publicPaths = Object.values(PUBLIC_ROUTES).flatMap((paths) =>
      Object.values(paths),
    );

    expect(publicPaths.length).toBeGreaterThan(20);
    for (const path of publicPaths) {
      expect(isSurfaceAllowedOnHost(path, platformOnly)).toBe(false);
    }
  });

  it("refuses a public path the registry has never heard of", () => {
    // Fail-closed is the default branch, not a list: an unregistered path is a
    // tenant public path we have not met yet, and a platform-only host owns no
    // tenant to answer for it.
    for (const path of ["/o-necemu-novom", "/robots.txt", "/sitemap.xml"]) {
      expect(isSurfaceAllowedOnHost(path, platformOnly)).toBe(false);
    }
  });

  it("keeps auth and route handlers answering on every host", () => {
    // Without these the fix would break what it protects: the workspace lives
    // on the platform host and reaches its data through `/api`, and nobody
    // signs in anywhere without `/prijava`.
    for (const path of [
      "/prijava",
      "/registracija",
      "/prijava/sso-callback",
      "/api/me",
      "/api/superadmin/diagnostics",
    ]) {
      expect(isHostNeutralPath(path)).toBe(true);
      expect(isSurfaceAllowedOnHost(path, platformOnly)).toBe(true);
      expect(isSurfaceAllowedOnHost(path, tenantOnly)).toBe(true);
    }
  });

  it("still matches whole segments when deciding host neutrality", () => {
    // `/apiary` is not the API, and `/prijavara` is not the sign-in page.
    expect(isHostNeutralPath("/apiary")).toBe(false);
    expect(isHostNeutralPath("/prijavara")).toBe(false);
    expect(isSurfaceAllowedOnHost("/apiary", platformOnly)).toBe(false);
  });

  it("leaves the founding tenant's domain serving both surfaces", () => {
    // The fix must not cost anything today: psihointegritet.com is genuinely
    // both, so its public tree, its clients and the workspace all still answer.
    for (const path of [
      "/",
      "/kompas",
      "/usluge",
      "/nalog",
      "/radni-prostor",
    ]) {
      expect(isSurfaceAllowedOnHost(path, both)).toBe(true);
    }
  });

  it("applies to nested paths, not just the root of a surface", () => {
    expect(isSurfaceAllowedOnHost("/superadmin/tenants", tenantOnly)).toBe(
      false,
    );
    expect(isSurfaceAllowedOnHost("/nalog/termini", platformOnly)).toBe(false);
  });

  it("matches whole segments only", () => {
    // `/nalogodavac` is a public word, not the client area.
    expect(hasRoutePrefix("/nalogodavac", ["/nalog"])).toBe(false);
    expect(hasRoutePrefix("/nalog", ["/nalog"])).toBe(true);
    expect(hasRoutePrefix("/nalog/termini", ["/nalog"])).toBe(true);
  });
});
