import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  FOUNDING_TENANT_SLUG,
  MissingDeploymentTenantError,
  deploymentSlugFromEnv,
  resolveDeploymentSlug,
} from "./deployment-slug";
import { deploymentPublicSite } from "./organizations";

const originalSlug = process.env.DEFAULT_ORGANIZATION_SLUG;
const originalEnv = process.env.DEPLOYMENT_ENV;

afterEach(() => {
  process.env.DEFAULT_ORGANIZATION_SLUG = originalSlug;
  process.env.DEPLOYMENT_ENV = originalEnv;
});

describe("resolveDeploymentSlug", () => {
  it("falls back to the founding tenant in development", () => {
    // The only reason the fallback survives: a machine with no configuration
    // should still run.
    expect(resolveDeploymentSlug(undefined, "development")).toBe(
      FOUNDING_TENANT_SLUG,
    );
    expect(resolveDeploymentSlug(undefined, undefined)).toBe(
      FOUNDING_TENANT_SLUG,
    );
  });

  it.each(["staging", "production"])(
    "refuses an unnamed tenant in %s",
    (deploymentEnv) => {
      // The regression this exists for: an unset variable on a second
      // deployment used to serve the founding tenant's site under another
      // tenant's domain, with nothing raised anywhere.
      expect(() => resolveDeploymentSlug(undefined, deploymentEnv)).toThrow(
        MissingDeploymentTenantError,
      );
      expect(() => resolveDeploymentSlug("", deploymentEnv)).toThrow(
        MissingDeploymentTenantError,
      );
      // Whitespace reads as unset to a person and must to the code too.
      expect(() => resolveDeploymentSlug("   ", deploymentEnv)).toThrow(
        MissingDeploymentTenantError,
      );
    },
  );

  it("names the variable and the environment when it refuses", () => {
    expect(() => resolveDeploymentSlug(undefined, "production")).toThrow(
      /DEFAULT_ORGANIZATION_SLUG/,
    );
    expect(() => resolveDeploymentSlug(undefined, "production")).toThrow(
      /production/,
    );
  });

  it.each(["development", "staging", "production"])(
    "honours an explicit tenant in %s",
    (deploymentEnv) => {
      expect(resolveDeploymentSlug("sanja-neuer", deploymentEnv)).toBe(
        "sanja-neuer",
      );
    },
  );

  it("trims the value it returns", () => {
    expect(resolveDeploymentSlug("  sanja-neuer  ", "production")).toBe(
      "sanja-neuer",
    );
  });
});

describe("deploymentSlugFromEnv", () => {
  it("reads the ambient environment", () => {
    process.env.DEFAULT_ORGANIZATION_SLUG = "sanja-neuer";
    process.env.DEPLOYMENT_ENV = "production";
    expect(deploymentSlugFromEnv()).toBe("sanja-neuer");
  });

  it("refuses a deployed environment with nothing set", () => {
    delete process.env.DEFAULT_ORGANIZATION_SLUG;
    process.env.DEPLOYMENT_ENV = "staging";
    expect(() => deploymentSlugFromEnv()).toThrow(MissingDeploymentTenantError);
  });
});

describe("an unregistered tenant still fails closed", () => {
  it("throws rather than serving some other organization", () => {
    // Two different failures, deliberately kept apart: "no tenant named" is
    // caught above, "named a tenant nobody registered" is caught here. Neither
    // may degrade into the founding tenant.
    process.env.DEFAULT_ORGANIZATION_SLUG = "not-a-tenant";
    process.env.DEPLOYMENT_ENV = "production";
    expect(() => deploymentPublicSite()).toThrow(/not-a-tenant/);
  });
});
