import { describe, expect, it, vi } from "vitest";

const { serverEnvMock } = vi.hoisted(() => ({
  serverEnvMock: { DEFAULT_ORGANIZATION_SLUG: "psihointegritet" },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/validation/env", () => ({ serverEnv: serverEnvMock }));

import { PLATFORM_DEFAULT_LOCALE } from "@/i18n/locales";

import {
  UnknownOrganizationError,
  getDeploymentOrganization,
  resolveDeploymentOrganization,
} from "./org-context";

describe("resolveDeploymentOrganization", () => {
  it("keeps the founding tenant on Serbian, never on the platform default", () => {
    // The regression this exists for: D-077 makes `en` the platform default,
    // and the only organization that exists today speaks `sr-Latn`. If these
    // two ever coincide, the live site has silently changed language.
    const organization = resolveDeploymentOrganization("psihointegritet");

    expect(organization.uiLocale).toBe("sr-Latn");
    expect(organization.defaultContentLocale).toBe("sr-Latn");
    expect(organization.uiLocale).not.toBe(PLATFORM_DEFAULT_LOCALE);
  });

  it("carries a timezone that is not derived from the locale", () => {
    // `sr-Latn` must not imply Belgrade any more than `en` implies America —
    // the field travels separately so a future organization can pair either.
    expect(resolveDeploymentOrganization("psihointegritet").timeZone).toBe(
      "Europe/Belgrade",
    );
  });

  it("throws on an unregistered slug rather than falling back to English", () => {
    // Fail-closed: a typo'd DEFAULT_ORGANIZATION_SLUG must crash the request,
    // not serve the whole Serbian site in English with no error anywhere.
    expect(() => resolveDeploymentOrganization("psihointegritet-typo")).toThrow(
      UnknownOrganizationError,
    );
    expect(() => resolveDeploymentOrganization("")).toThrow(
      UnknownOrganizationError,
    );
  });

  it("names the slug and the fix in the error message", () => {
    expect(() => resolveDeploymentOrganization("nepostojeci")).toThrow(
      /nepostojeci.*DEFAULT_ORGANIZATION_SLUG/s,
    );
  });
});

describe("getDeploymentOrganization", () => {
  it("resolves the deployment organization from the canonical env var", async () => {
    // Canonical name shared with the backend's `settings.default_organization_slug`
    // (backend/.env.example). One deployment, one organization, one name.
    await expect(getDeploymentOrganization()).resolves.toMatchObject({
      slug: "psihointegritet",
      uiLocale: "sr-Latn",
    });
  });

  it("propagates the unknown-slug failure instead of degrading", async () => {
    serverEnvMock.DEFAULT_ORGANIZATION_SLUG = "not-registered";
    try {
      await expect(getDeploymentOrganization()).rejects.toThrow(
        UnknownOrganizationError,
      );
    } finally {
      serverEnvMock.DEFAULT_ORGANIZATION_SLUG = "psihointegritet";
    }
  });
});
