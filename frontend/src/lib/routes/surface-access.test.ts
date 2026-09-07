import { describe, expect, it } from "vitest";

import { hasRoutePrefix, isSurfaceAllowedOnHost } from "./match";

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
