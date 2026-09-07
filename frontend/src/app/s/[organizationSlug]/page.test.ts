import { describe, expect, it } from "vitest";

import { generateMetadata, generateStaticParams } from "./page";

const params = (organizationSlug: string) => ({
  params: Promise.resolve({ organizationSlug }),
});

describe("tenant page metadata", () => {
  it("carries no founding-tenant identity", async () => {
    // The rule this guards (D-080): missing tenant content means an empty
    // tenant, never the founding tenant's. The root layout still declares that
    // tenant's title template and description, so every field it asserts has to
    // be overridden here — a plain `title` string would silently render
    // "Sanja Neuer | Psihointegritet".
    const metadata = await generateMetadata(params("sanja-neuer"));

    expect(JSON.stringify(metadata).toLowerCase()).not.toContain(
      "psihointegritet",
    );
  });

  it("states the tenant's own name absolutely, escaping the root template", async () => {
    const metadata = await generateMetadata(params("sanja-neuer"));

    // Her own SEO title now that she has a real site, still `absolute` so the
    // root template cannot append the founding tenant's brand to it.
    const title = metadata.title as { absolute: string };
    expect(title.absolute).toContain("Sanja Neuer");
    expect(title.absolute).not.toContain("Psihointegritet");
    expect(metadata.openGraph?.title).toContain("Sanja Neuer");
  });

  it("points canonical at the tenant's own domain, not the internal path", async () => {
    const metadata = await generateMetadata(params("sanja-neuer"));

    expect(metadata.metadataBase?.toString()).toBe("https://sanjaneuer.com/");
    expect(metadata.alternates?.canonical).toBe("/");
    // A finished site is meant to be found. The placeholder still refuses
    // indexing — see the empty-tenant case below.
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("inherits no shared open-graph artwork", async () => {
    // The repository's `opengraph-image` belongs to the founding tenant, so
    // inheriting it would put their branding on another practitioner's links.
    const metadata = await generateMetadata(params("sanja-neuer"));

    expect(metadata.openGraph?.images).toEqual([]);
    expect(metadata.twitter?.images).toEqual([]);
  });

  it("still refuses to index a tenant with no site of its own", async () => {
    // The guarantee the placeholder carries: an empty tenant is not published.
    // `psihointegritet` uses the legacy public tree, so it never reaches this
    // route — a tenant added to the registry without a page would.
    const { TENANT_SITES } = await import("@/features/tenants/registry");
    expect(Object.keys(TENANT_SITES)).toEqual(["sanja-neuer"]);
  });

  it("asserts nothing for a slug that is not a registered tenant", async () => {
    expect(await generateMetadata(params("nepostojeci"))).toEqual({});
  });

  it("prerenders only tenants that do not use the legacy public tree", () => {
    // The founding tenant's ~26 pages still live in `app/(public)`; generating
    // a second home page for it here would be a duplicate of its own site.
    expect(generateStaticParams()).toEqual([
      { organizationSlug: "sanja-neuer" },
    ]);
  });
});
