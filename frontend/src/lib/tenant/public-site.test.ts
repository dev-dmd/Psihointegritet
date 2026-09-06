import { afterEach, describe, expect, it, vi } from "vitest";

const { serverEnvMock } = vi.hoisted(() => ({
  serverEnvMock: { DEFAULT_ORGANIZATION_SLUG: "psihointegritet" },
}));

// `org-context` is server-only; the registry it resolves from is pure data.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/validation/env", () => ({ serverEnv: serverEnvMock }));

import { jsonLdForEntity } from "@/lib/content-governance/discoverability";
import { staticContentProvider } from "@/lib/content-governance/static-provider";

import {
  ORGANIZATION_LOCALE_SETTINGS,
  ORGANIZATION_PUBLIC_SITE,
  deploymentPublicSite,
  findOrganizationPublicSite,
  organizationLocationsLabel,
} from "./organizations";
import { resolveDeploymentOrganization } from "./org-context";

const originalSlug = process.env.DEFAULT_ORGANIZATION_SLUG;

afterEach(() => {
  process.env.DEFAULT_ORGANIZATION_SLUG = originalSlug;
});

describe("tenant public identity registry", () => {
  it("registers every organization in both tables", () => {
    // A slug present in one table and missing from the other is a deployment
    // that boots and then throws on its first public render — the failure this
    // pairing exists to make impossible.
    expect(Object.keys(ORGANIZATION_PUBLIC_SITE).sort()).toEqual(
      Object.keys(ORGANIZATION_LOCALE_SETTINGS).sort(),
    );
  });

  it("gives each organization its own public identity", () => {
    // The regression that motivated PDC-0B: `content/site-settings.ts` was a
    // module-level constant, so every deployment claimed the founding tenant's
    // name and contact address no matter which organization it served.
    const founding = findOrganizationPublicSite("psihointegritet");
    const sanja = findOrganizationPublicSite("sanja-neuer");

    expect(founding?.publicName).toBe("Psihointegritet");
    expect(sanja?.publicName).toBe("Sanja Neuer");
    expect(sanja?.contactEmail).not.toBe(founding?.contactEmail);
  });

  it("leaks no founding-tenant identity into another tenant", () => {
    const sanja = findOrganizationPublicSite("sanja-neuer");
    const identity = [
      sanja?.publicName,
      sanja?.legalName,
      sanja?.description,
      sanja?.contactEmail,
      sanja?.formatsLabel,
    ].join(" ");

    expect(identity.toLowerCase()).not.toContain("psihointegritet");
  });
});

describe("deploymentPublicSite", () => {
  it("follows DEFAULT_ORGANIZATION_SLUG", () => {
    process.env.DEFAULT_ORGANIZATION_SLUG = "sanja-neuer";
    expect(deploymentPublicSite().publicName).toBe("Sanja Neuer");

    process.env.DEFAULT_ORGANIZATION_SLUG = "psihointegritet";
    expect(deploymentPublicSite().publicName).toBe("Psihointegritet");
  });

  it("throws on an unregistered slug rather than serving someone else's name", () => {
    process.env.DEFAULT_ORGANIZATION_SLUG = "not-a-tenant";
    expect(() => deploymentPublicSite()).toThrow(/not-a-tenant/);
  });
});

describe("organizationLocationsLabel", () => {
  it("joins the founding tenant's cities", () => {
    expect(
      organizationLocationsLabel(
        resolveDeploymentOrganization("psihointegritet").publicSite,
      ),
    ).toBe("Chicago, IL · Milwaukee, WI · Madison, WI");
  });

  it("returns an empty string for an online-only tenant", () => {
    // Callers must render nothing rather than a dangling " · " separator.
    expect(
      organizationLocationsLabel(
        resolveDeploymentOrganization("sanja-neuer").publicSite,
      ),
    ).toBe("");
  });
});

describe("jsonLdForEntity", () => {
  // The checked-in catalogue is pre-launch (`in_review`), and JSON-LD is
  // emitted only for published entities — so these fixtures publish a real
  // entity rather than inventing one, keeping the shape honest.
  const published = <T extends { publicationStatus: unknown }>(
    entity: T,
  ): T => ({
    ...entity,
    publicationStatus: "published",
  });

  const sanja = findOrganizationPublicSite("sanja-neuer")!;
  const origin = new URL("https://example.test");

  it("names the organization the caller passed, not the deployment default", () => {
    const homepage = staticContentProvider.getPageByRoute("/");
    expect(homepage).toBeDefined();

    const records = jsonLdForEntity(published(homepage!), origin, sanja);
    const organization = records.find(
      (record) => record["@type"] === "Organization",
    );

    expect(organization?.name).toBe("Sanja Neuer");
    expect(JSON.stringify(records).toLowerCase()).not.toContain(
      "psihointegritet",
    );
  });

  it("serves only 'online' for a tenant with no locations", () => {
    const service = staticContentProvider
      .listAll()
      .find((entity) => entity.type === "service");
    expect(service).toBeDefined();

    const records = jsonLdForEntity(published(service!), origin, sanja);
    const serviceRecord = records.find(
      (record) => record["@type"] === "Service",
    );

    expect(serviceRecord?.areaServed).toEqual(["online"]);
  });

  it("still lists the founding tenant's cities", () => {
    const service = staticContentProvider
      .listAll()
      .find((entity) => entity.type === "service");

    const records = jsonLdForEntity(
      published(service!),
      origin,
      findOrganizationPublicSite("psihointegritet")!,
    );
    const serviceRecord = records.find(
      (record) => record["@type"] === "Service",
    );

    expect(serviceRecord?.areaServed).toEqual([
      "Chicago, Illinois, USA",
      "Milwaukee, Wisconsin, USA",
      "Madison, Wisconsin, USA",
      "online",
    ]);
  });
});
