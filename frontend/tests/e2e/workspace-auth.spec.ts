import { expect, test } from "@playwright/test";

/**
 * Server-side protection of the Control Center (/radni-prostor). These run
 * without a Clerk session: every route must redirect to sign-in at the HTTP
 * level with a return path. Role-based routing (org_admin vs therapist vs
 * client) is covered by unit tests in src/lib/auth and manual smoke, until
 * Clerk testing tokens are wired.
 */

const protectedPaths = [
  "/radni-prostor",
  "/radni-prostor/termini",
  "/radni-prostor/klijenti",
  "/radni-prostor/kompanije",
  "/radni-prostor/usluge",
  "/radni-prostor/istrazivanja",
  "/radni-prostor/terapeuti",
  "/radni-prostor/profil",
  "/radni-prostor/podesavanja",
];

for (const path of protectedPaths) {
  test(`unauthenticated request to ${path} redirects to sign-in with a return path`, async ({
    request,
  }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    const location = response.headers()["location"] ?? "";
    expect(location).toContain("/prijava");
    expect(location).toContain(`redirect_url=${encodeURIComponent(path)}`);
  });
}

test("browser visit to /radni-prostor lands on the sign-in page", async ({
  page,
}) => {
  await page.goto("/radni-prostor");
  await expect(page).toHaveURL(/\/prijava/);
});
