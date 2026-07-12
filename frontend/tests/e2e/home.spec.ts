import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home page renders server-side", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Psihointegritet/i }),
  ).toBeVisible();

  // process.version can only be read on the server — proves RSC/SSR ran.
  await expect(page.getByTestId("server-runtime")).toContainText("Node v");
});

test("home page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(critical).toEqual([]);
});
