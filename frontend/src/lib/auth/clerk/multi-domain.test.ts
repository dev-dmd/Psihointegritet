import { afterEach, describe, expect, it } from "vitest";

import {
  allowedRedirectOrigins,
  clerkDomainConfig,
  clerkSatelliteDomainFor,
} from "@/lib/auth/clerk/multi-domain";

const originalPrimary = process.env.CLERK_PRIMARY_HOST;
const originalPlatform = process.env.PLATFORM_HOST;

afterEach(() => {
  process.env.CLERK_PRIMARY_HOST = originalPrimary;
  process.env.PLATFORM_HOST = originalPlatform;
});

const at = (host: string) => new URL(`https://${host}/prijava`);

describe("Clerk configuration across many hostnames", () => {
  it("declares no satellite before the cutover", () => {
    // The instance is still single-domain. Declaring satellites against a
    // primary that has not moved would break sign-in on every host at once.
    delete process.env.CLERK_PRIMARY_HOST;
    const config = clerkDomainConfig();
    expect(config.isSatellite).toBe(false);
    expect(config.signInUrl).toBe("/prijava");
    expect(config.signUpUrl).toBe("/registracija");
  });

  it("hands sign-in to the primary domain after the cutover", () => {
    process.env.CLERK_PRIMARY_HOST = "p-digital-center.com";
    const config = clerkDomainConfig();
    expect(config.isSatellite).toBe(true);
    expect(config.signInUrl).toBe("https://p-digital-center.com/prijava");
    expect(config.signUpUrl).toBe("https://p-digital-center.com/registracija");
  });

  it("resolves each served host to itself once a primary is set", () => {
    process.env.CLERK_PRIMARY_HOST = "p-digital-center.com";
    process.env.PLATFORM_HOST = "p-digital-center.com";
    for (const host of [
      "psihointegritet.com",
      "www.psihointegritet.com",
      "sanjaneuer.com",
      "sanja-neuer.vercel.app",
    ]) {
      expect(clerkSatelliteDomainFor(at(host))).toBe(host);
    }
    expect(clerkSatelliteDomainFor(at("p-digital-center.com"))).toBe(
      "p-digital-center.com",
    );
  });

  it("never declares a host the registry does not know", () => {
    // Naming a domain Clerk has never heard of is worse than naming none, so an
    // unknown host falls back to the primary instead.
    process.env.CLERK_PRIMARY_HOST = "p-digital-center.com";
    process.env.PLATFORM_HOST = "p-digital-center.com";
    for (const host of ["unknown.vercel.app", "evil.com"]) {
      expect(clerkSatelliteDomainFor(at(host))).toBe("p-digital-center.com");
    }
  });

  it("lists redirect origins from the registry, with no wildcard", () => {
    process.env.PLATFORM_HOST = "p-digital-center.com";
    process.env.CLERK_PRIMARY_HOST = "p-digital-center.com";
    const origins = allowedRedirectOrigins();

    expect(origins).toContain("https://psihointegritet.com");
    expect(origins).toContain("https://sanjaneuer.com");
    expect(origins).toContain("https://sanja-neuer.vercel.app");
    expect(origins).toContain("https://p-digital-center.com");
    // A wildcard would make every preview deployment a valid place to land a
    // session on.
    expect(origins.some((origin) => origin.includes("*"))).toBe(false);
    expect(origins).not.toContain("https://unknown.vercel.app");
  });

  it("normalises the host before comparing it to the primary", () => {
    process.env.CLERK_PRIMARY_HOST = "P-Digital-Center.com";
    expect(clerkSatelliteDomainFor(at("p-digital-center.com:443"))).toBe(
      "p-digital-center.com",
    );
  });
});
