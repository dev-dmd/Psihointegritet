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

    expect(metadata.title).toEqual({ absolute: "Sanja Neuer" });
    expect(metadata.openGraph?.title).toBe("Sanja Neuer");
  });

  it("points canonical at the tenant's own domain, not the internal path", async () => {
    const metadata = await generateMetadata(params("sanja-neuer"));

    expect(metadata.metadataBase?.toString()).toBe("https://sanjaneuer.com/");
    expect(metadata.alternates?.canonical).toBe("/");
    // An empty tenant has nothing worth indexing yet.
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("inherits no shared open-graph artwork", async () => {
    // The repository's `opengraph-image` belongs to the founding tenant, so
    // inheriting it would put their branding on another practitioner's links.
    const metadata = await generateMetadata(params("sanja-neuer"));

    expect(metadata.openGraph?.images).toEqual([]);
    expect(metadata.twitter?.images).toEqual([]);
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
