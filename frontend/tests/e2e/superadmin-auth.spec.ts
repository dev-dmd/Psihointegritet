import { expect, test } from "@playwright/test";

/**
 * Server-side protection of the superadmin area (D-026). These run without a
 * Clerk session: every protected path must redirect to sign-in at the HTTP
 * level — proving the guard chain, not just hidden navigation. Signed-in role
 * routing (superadmin vs staff vs client) is covered by unit tests in
 * src/lib/auth and manual smoke, until Clerk testing tokens are wired.
 */

const protectedPaths = [
  "/superadmin",
  "/superadmin/tenants",
  "/superadmin/tenants/psihointegritet",
  "/superadmin/features",
  "/superadmin/diagnostics",
  "/superadmin/billing",
  "/superadmin/audit-log",
  "/superadmin/settings",
  "/radni-prostor",
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
    // Without redirect_url, Clerk falls back to signInFallbackRedirectUrl
    // ("/nalog") after sign-in regardless of where the visitor was headed.
    expect(location).toContain(`redirect_url=${encodeURIComponent(path)}`);
  });
}

test("browser visit to /superadmin lands on the sign-in page with a return path", async ({
  page,
}) => {
  await page.goto("/superadmin");
  await expect(page).toHaveURL(/\/prijava/);
  expect(new URL(page.url()).searchParams.get("redirect_url")).toBe(
    "/superadmin",
  );
});
