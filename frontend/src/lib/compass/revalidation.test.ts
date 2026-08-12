import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

import { revalidatePublicCompassAfterMutation } from "./revalidation";

describe("public Compass mutation revalidation", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    revalidateTagMock.mockReset();
  });

  it("does not invalidate anything after a failed backend response", () => {
    expect(revalidatePublicCompassAfterMutation({ ok: false })).toBe(false);
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("invalidates the shared tag and public collection paths after success", () => {
    expect(revalidatePublicCompassAfterMutation({ ok: true })).toBe(true);
    expect(revalidateTagMock).toHaveBeenCalledWith("compass:public:sr-Latn", {
      expire: 0,
    });
    expect(revalidatePathMock.mock.calls.map(([path]) => path)).toEqual([
      "/kompas/oblasti",
      "/kompas/teme",
      "/sitemap.xml",
    ]);
  });
});
