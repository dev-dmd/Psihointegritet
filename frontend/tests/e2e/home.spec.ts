import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home page is server-rendered with the hero headline", async ({
  request,
}) => {
  // Raw HTML fetch (no JS) proves the page renders on the server.
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(
    "Stručna podrška za bolje razumevanje sebe i svojih odnosa.",
  );
});

test("homepage sections render", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Stručna podrška za bolje razumevanje sebe i svojih odnosa.",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Upoznajte terapeute Psihointegriteta" }),
  ).toBeVisible();

  await expect(
    page.getByRole("navigation", { name: "Glavna navigacija" }),
  ).toBeVisible();
});

test("FAQ accordion opens one item at a time", async ({ page }) => {
  await page.goto("/");

  const first = page.getByRole("button", {
    name: "Da li je sve što kažem poverljivo?",
  });
  const second = page.getByRole("button", { name: "Koliko traje terapija?" });

  await expect(first).toHaveAttribute("aria-expanded", "true");

  await second.click();

  await expect(second).toHaveAttribute("aria-expanded", "true");
  await expect(first).toHaveAttribute("aria-expanded", "false");
});

test("home page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(critical).toEqual([]);
});
