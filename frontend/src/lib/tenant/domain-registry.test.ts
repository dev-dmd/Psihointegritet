import { afterEach, describe, expect, it } from "vitest";

import {
  MissingPlatformHostError,
  PLATFORM_NAME,
  TENANT_DOMAINS,
  isPlatformHost,
  normalizeHost,
  resolvePlatformHost,
  tenantForHost,
  tenantForSlug,
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
    expect(sanja?.apiBaseUrl).not.toBe(psiho?.apiBaseUrl);
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
