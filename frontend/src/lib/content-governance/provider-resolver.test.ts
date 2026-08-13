import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolvePublicLocaleMock } = vi.hoisted(() => ({
  resolvePublicLocaleMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/tenant/public-locale", () => ({
  resolvePublicLocale: resolvePublicLocaleMock,
}));
vi.mock("@/lib/validation/env", () => ({
  serverEnv: { NEXT_PUBLIC_API_URL: "https://backend.example" },
}));

import { publicContentCacheTag } from "./cache";
import { getContentProvider } from "./provider-resolver";
import { staticContentProvider } from "./static-provider";

beforeEach(() => {
  resolvePublicLocaleMock.mockReset();
  resolvePublicLocaleMock.mockResolvedValue("en");
  vi.restoreAllMocks();
});

describe("public CMS locale", () => {
  it("uses ui_locale in both the backend query and cache tag", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(getContentProvider()).resolves.toBe(staticContentProvider);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example/api/v1/public/content/published?locale=en",
      {
        next: {
          revalidate: 300,
          tags: [publicContentCacheTag("en")],
        },
      },
    );
  });

  it("has a distinct cache identity for each supported locale", () => {
    expect(publicContentCacheTag("en")).toBe("content:published:en");
    expect(publicContentCacheTag("sr-Latn")).toBe("content:published:sr-Latn");
  });

  it.each([
    "../../app/api/compass/flow/route.ts",
    "../../app/api/compass/taxonomy/route.ts",
  ])("%s contains no hardcoded public locale", (relativePath) => {
    const source = readFileSync(join(__dirname, relativePath), "utf8");
    expect(source).toContain("resolvePublicLocale()");
    expect(source).not.toContain("locale=sr-Latn");
  });
});
