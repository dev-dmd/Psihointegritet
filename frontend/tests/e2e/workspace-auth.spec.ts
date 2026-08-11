import { expect, test } from "@playwright/test";

import { localizedPath } from "../../src/lib/routes/localized-path";
import {
  PLATFORM_ROUTES,
  type PlatformRouteId,
} from "../../src/lib/routes/platform-routes";

/**
 * Server-side protection of every authenticated surface. These run without a
 * Clerk session: each route must redirect to sign-in at the HTTP level with a
 * return path. Role-based routing (org_admin vs therapist vs client) is covered
 * by unit tests in src/lib/auth and manual smoke, until Clerk testing tokens
 * are wired.
 *
 * **The path list is generated from the route registry, not typed out.** It
 * used to be nine hardcoded strings, which meant a route added later — or a
 * locale added later — was simply not covered, and the gap looked exactly like
 * a passing suite. This is the D-077 risk-1 mitigation: the only failure in the
 * locale work with a security consequence is a Control Center path that serves
 * without a session.
 */
const LIVE_LOCALE = "sr-Latn" as const;

function concreteParams(routeId: PlatformRouteId): Record<string, string> {
  const definition = PLATFORM_ROUTES[routeId];
  return Object.fromEntries(
    ("params" in definition ? definition.params : []).map((name: string) => [
      name,
      "e2e",
    ]),
  );
}

const protectedPaths = (
  Object.keys(PLATFORM_ROUTES) as PlatformRouteId[]
).flatMap((routeId) => {
  const definition = PLATFORM_ROUTES[routeId];
  if (!("protected" in definition)) return [];
  const params = concreteParams(routeId);
  // Both locales: the proxy matches the external path, so a Serbian
  // organization must gate `/workspace/...` too — it 308s, and a 308 to an
  // ungated path would be a hole.
  return [
    localizedPath(routeId, { locale: LIVE_LOCALE, params } as never),
    localizedPath(routeId, { locale: "en", params } as never),
  ];
});

for (const path of [...new Set(protectedPaths)]) {
  test(`unauthenticated request to ${path} does not serve content`, async ({
    request,
  }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    // A 308 to the canonical locale is a legitimate first hop; what must never
    // happen is a 200 without a session.
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);

    const location = response.headers()["location"] ?? "";
    if (response.status() === 308) {
      // Canonical redirect — follow it once and require the gate there.
      const next = await request.get(location, { maxRedirects: 0 });
      expect(next.status()).toBeGreaterThanOrEqual(300);
      expect(next.status()).toBeLessThan(400);
      expect(next.headers()["location"] ?? "").toContain("/prijava");
      return;
    }

    expect(location).toContain("/prijava");
    expect(location).toContain(`redirect_url=${encodeURIComponent(path)}`);
  });
}

test("browser visit to the workspace lands on the sign-in page", async ({
  page,
}) => {
  await page.goto(localizedPath("workspace.home", { locale: LIVE_LOCALE }));
  await expect(page).toHaveURL(/\/prijava/);
});

test("the retired availability path still resolves rather than 404ing", async ({
  request,
}) => {
  // `/dostupnost` became `/raspored`. Bookmarks and email links to the old path
  // must reach the gate, not a dead end.
  const response = await request.get("/radni-prostor/dostupnost", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"] ?? "").toContain(
    "/radni-prostor/raspored",
  );
});
