import { afterEach, describe, expect, it } from "vitest";

import {
  MissingPlatformHostError,
  PLATFORM_NAME,
  TENANT_DOMAINS,
  isPlatformHost,
  isTemporaryAccessHost,
  normalizeHost,
  resolveHostBinding,
  resolvePlatformHost,
  tenantForHost,
  tenantForSlug,
  tenantSiteUrl,
} from "./domain-registry";

const originalPlatformHost = process.env.PLATFORM_HOST;

afterEach(() => {
  process.env.PLATFORM_HOST = originalPlatformHost;
});

describe("hostname → organization", () => {
  it("resolves each tenant from its own domains", () => {
    expect(tenantForHost("sanjaneuer.com")?.organizationSlug).toBe(
      "sanja-neuer",
    );
    expect(tenantForHost("www.sanjaneuer.com")?.organizationSlug).toBe(
      "sanja-neuer",
    );
    expect(tenantForHost("psihointegritet.com")?.organizationSlug).toBe(
      "psihointegritet",
    );
  });

  it("resolves nothing for a host nobody registered", () => {
    // Fail-closed. A domain someone points at this project must not land on
    // whichever tenant happens to be first.
    expect(tenantForHost("nepoznat.com")).toBeUndefined();
    expect(tenantForHost("")).toBeUndefined();
    expect(tenantForHost(null)).toBeUndefined();
  });

  it("matches regardless of port or case", () => {
    expect(normalizeHost("SanjaNeuer.com:3000")).toBe("sanjaneuer.com");
    expect(tenantForHost("SANJANEUER.COM:443")?.organizationSlug).toBe(
      "sanja-neuer",
    );
  });

  it("never maps one tenant's domain to another tenant", () => {
    const pairs = TENANT_DOMAINS.flatMap((tenant) =>
      tenant.domains.map((domain) => [domain, tenant.organizationSlug]),
    );
    for (const [domain, slug] of pairs) {
      expect(tenantForHost(domain as string)?.organizationSlug).toBe(slug);
    }
    // Every domain belongs to exactly one tenant.
    const domains = pairs.map(([domain]) => domain);
    expect(new Set(domains).size).toBe(domains.length);
  });
});

describe("tenant configuration", () => {
  it("gives each tenant its own public URL and its own backend", () => {
    const sanja = tenantForSlug("sanja-neuer");
    const psiho = tenantForSlug("psihointegritet");

    expect(sanja?.publicUrl).toBe("https://sanjaneuer.com");
    expect(psiho?.publicUrl).toBe("https://psihointegritet.com");
    // The reason the API target lives here rather than in one env variable:
    // one project, two backends, two databases.
    expect(sanja?.productionApiBaseUrl).not.toBe(psiho?.productionApiBaseUrl);
  });

  it("names the platform as itself, never as a tenant", () => {
    // D-080: the founding tenant stopped being the platform's identity.
    expect(PLATFORM_NAME).toBe("P. Digital Centar");
    expect(PLATFORM_NAME.toLowerCase()).not.toContain("psihointegritet");
  });
});

describe("platform host", () => {
  it("comes from configuration, so tomorrow's domain is an env change", () => {
    process.env.PLATFORM_HOST = "p-digital-center.com";
    expect(isPlatformHost("p-digital-center.com")).toBe(true);
    expect(isPlatformHost("sanjaneuer.com")).toBe(false);
  });

  it("keeps localhost usable without editing a hosts file", () => {
    expect(isPlatformHost("localhost")).toBe(true);
    expect(isPlatformHost("localhost:3007")).toBe(true);
  });

  it("does not treat an unconfigured value as a wildcard", () => {
    delete process.env.PLATFORM_HOST;
    // With nothing configured only the development hosts match — an empty
    // variable must never make every host the platform.
    expect(isPlatformHost("")).toBe(false);
    expect(isPlatformHost("anything.com")).toBe(false);
    expect(isPlatformHost("localhost")).toBe(true);
  });
});

describe("PLATFORM_HOST on a deployed environment", () => {
  it("refuses to resolve without one", () => {
    // Forgetting it is not a small misconfiguration: owner surfaces answer only
    // on the platform host, so an unset value makes /radni-prostor and
    // /superadmin 404 on every domain at once. Refused where `serverEnv` loads,
    // which is build time, rather than found by an owner who cannot sign in.
    for (const env of ["preview", "staging", "production"]) {
      expect(() => resolvePlatformHost("", env)).toThrow(
        MissingPlatformHostError,
      );
    }
  });

  it("names PLATFORM_HOST and the environment in the error", () => {
    expect(() => resolvePlatformHost(undefined, "production")).toThrow(
      /PLATFORM_HOST/,
    );
    expect(() => resolvePlatformHost(undefined, "production")).toThrow(
      /production/,
    );
  });

  it("normalizes what it is given", () => {
    expect(resolvePlatformHost("PDC.Local:3000", "production")).toBe(
      "pdc.local",
    );
  });

  it("stays optional on a laptop", () => {
    // Local development already treats localhost as the platform.
    expect(resolvePlatformHost("", "development")).toBe("");
    expect(resolvePlatformHost(undefined, undefined)).toBe("");
  });
});

describe("host binding", () => {
  const preview = { env: "preview", slug: "psihointegritet" };
  const production = { env: "production", slug: "psihointegritet" };

  it("binds a registered domain to its tenant", () => {
    expect(
      resolveHostBinding("sanjaneuer.com", production)?.tenant
        ?.organizationSlug,
    ).toBe("sanja-neuer");
  });

  it("refuses an unregistered host in production", () => {
    // The whole point of the registry: a domain someone points at this project
    // must not serve a tenant's site, and production has no preview URL to
    // excuse an unknown name.
    expect(resolveHostBinding("nepoznat.com", production)).toBeNull();
  });

  it("falls back to the deployment's own tenant on a preview URL", () => {
    // Every Vercel preview gets a hostname minted per deployment, which no
    // table can list. Without this a feature branch 404s in full and the
    // fail-closed rule reads as a broken deploy.
    const binding = resolveHostBinding("pdc-abc123.vercel.app", preview);

    expect(binding?.tenant?.organizationSlug).toBe("psihointegritet");
    // Both surfaces, so a branch can be reviewed end to end from one link.
    expect(binding?.isPlatform).toBe(true);
  });

  it("does not let the preview fallback reach production", () => {
    expect(resolveHostBinding("pdc-abc123.vercel.app", production)).toBeNull();
  });

  it("refuses a preview bound to a tenant nobody registered", () => {
    expect(
      resolveHostBinding("pdc-abc123.vercel.app", {
        env: "preview",
        slug: "ne-postoji",
      }),
    ).toBeNull();
  });

  it("prefers the registered domain over the deployment binding", () => {
    // A preview aliased to a tenant's own domain is that tenant, not whatever
    // the deployment happens to be bound to.
    const binding = resolveHostBinding("sanjaneuer.com", preview);

    expect(binding?.tenant?.organizationSlug).toBe("sanja-neuer");
  });

  it("reports a host that is both tenant and platform as both", () => {
    process.env.PLATFORM_HOST = "psihointegritet.com";
    const binding = resolveHostBinding("psihointegritet.com", production);

    expect(binding?.tenant?.organizationSlug).toBe("psihointegritet");
    expect(binding?.isPlatform).toBe(true);
  });

  it("gives a laptop both roles at once", () => {
    // `localhost` is the platform host, but it is also where the developer's
    // own tenant is served. Treating it as platform-only left /nalog answering
    // 404 on a machine that has no other host to offer.
    const binding = resolveHostBinding("localhost:3007", {
      env: "development",
      slug: "psihointegritet",
    });

    expect(binding?.tenant?.organizationSlug).toBe("psihointegritet");
    expect(binding?.isPlatform).toBe(true);
  });

  it("reports a platform-only host as owning no tenant", () => {
    process.env.PLATFORM_HOST = "p-digital-center.com";
    const binding = resolveHostBinding("p-digital-center.com", production);

    expect(binding?.tenant).toBeUndefined();
    expect(binding?.isPlatform).toBe(true);
  });
});

describe("temporary access host (sanjaneuer.com DNS unavailable)", () => {
  const production = { env: "production", slug: "psihointegritet" };

  it("resolves the temporary host to its tenant, and only it", () => {
    expect(tenantForHost("sanja-neuer.vercel.app")?.organizationSlug).toBe(
      "sanja-neuer",
    );
    expect(tenantForHost("psihointegritet.com")?.organizationSlug).toBe(
      "psihointegritet",
    );
    // The platform's own generated hostname belongs to no tenant.
    expect(tenantForHost("psihointegritet.vercel.app")).toBeUndefined();
  });

  it("trusts one hostname, never the `.vercel.app` suffix", () => {
    // A wildcard here would make every preview URL on the account a trusted
    // route into somebody's tenant. Only the listed host resolves.
    for (const host of [
      "unknown.vercel.app",
      "sanja-neuer.vercel.app.evil.com",
      "evil-sanja-neuer.vercel.app",
      "sanja-neuer.vercel.app.",
    ]) {
      expect(tenantForHost(host)).toBeUndefined();
    }
    expect(resolveHostBinding("unknown.vercel.app", production)).toBeNull();
  });

  it("keeps canonical on the real domain while the stand-in serves", () => {
    // The whole point of splitting the two fields: Google must not be asked to
    // index the temporary address as this practice's identity.
    const sanja = tenantForSlug("sanja-neuer");
    expect(sanja?.publicUrl).toBe("https://sanjaneuer.com");
    expect(sanja?.temporaryAccessUrl).toBe("https://sanja-neuer.vercel.app");
    expect(sanja?.publicUrl).not.toContain("vercel.app");
  });

  it("sends a person to where the site actually answers", () => {
    const sanja = tenantForSlug("sanja-neuer");
    const psiho = tenantForSlug("psihointegritet");
    expect(tenantSiteUrl(sanja!)).toBe("https://sanja-neuer.vercel.app");
    // A tenant whose own domain works is untouched by any of this.
    expect(tenantSiteUrl(psiho!)).toBe("https://psihointegritet.com");
  });

  it("marks only the stand-in as unindexable", () => {
    expect(isTemporaryAccessHost("sanja-neuer.vercel.app")).toBe(true);
    expect(isTemporaryAccessHost("SANJA-NEUER.VERCEL.APP:443")).toBe(true);
    for (const host of [
      "sanjaneuer.com",
      "www.sanjaneuer.com",
      "psihointegritet.com",
      "unknown.vercel.app",
      "",
      null,
    ]) {
      expect(isTemporaryAccessHost(host)).toBe(false);
    }
  });

  it("keeps every temporary host listed in `domains`", () => {
    // The invariant that stops the two from drifting: a host that can be
    // reached must be a host that resolves, or the stand-in 404s.
    for (const tenant of TENANT_DOMAINS) {
      if (!tenant.temporaryAccessUrl) continue;
      const host = new URL(tenant.temporaryAccessUrl).hostname;
      expect(tenant.domains).toContain(host);
    }
  });

  it("gives the stand-in the same tenant surface as the real domain", () => {
    // B2 invariants do not soften because the hostname is temporary: owner
    // surfaces stay off it, the client area stays on it.
    const binding = resolveHostBinding("sanja-neuer.vercel.app", production);
    expect(binding?.tenant?.organizationSlug).toBe("sanja-neuer");
    expect(binding?.isPlatform).toBe(false);
  });
});
