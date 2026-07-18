import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const drawerName = "Anketa o iskustvu podrške";

/** Mock the send endpoint so no real email leaves during tests. */
async function mockSurveyEndpoint(page: import("@playwright/test").Page) {
  await page.route("**/api/survey", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test("floating question button opens the research survey, not the matching quiz", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(
    "Pomozite nam da oblikujemo bolje iskustvo podrške",
  );
  // It must NOT be the matching flow.
  await expect(drawer).not.toContainText("Za koga tražite podršku?");
});

test("full survey submits and thanks the user", async ({ page }) => {
  await mockSurveyEndpoint(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();
  const drawer = page.getByRole("dialog", { name: drawerName });

  await drawer.getByRole("button", { name: "Započni anketu" }).click();
  await expect(drawer).toContainText("Pitanje 1 od 4");

  await drawer.getByRole("button", { name: "Da, online" }).click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  await drawer.getByRole("button", { name: "Umereno" }).click();
  await drawer.getByRole("button", { name: "Cena" }).click();

  // Review screen — optional note, then send.
  await expect(drawer).toContainText("Hvala na odgovorima");
  await drawer
    .getByLabel(/Vaš komentar/)
    .fill("Meni je online lakše za početak.");
  await drawer.getByRole("button", { name: "Pošalji" }).click();

  await expect(drawer).toContainText("Hvala vam!");
});

test("Mozda kasnije closes the survey without sending", async ({ page }) => {
  let called = false;
  await page.route("**/api/survey", async (route) => {
    called = true;
    await route.fulfill({ status: 200, body: "{}" });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();
  const drawer = page.getByRole("dialog", { name: drawerName });
  await drawer.getByRole("button", { name: "Započni anketu" }).click();
  await drawer.getByRole("button", { name: "Da, online" }).click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  await drawer.getByRole("button", { name: "Umereno" }).click();
  await drawer.getByRole("button", { name: "Cena" }).click();
  await drawer.getByRole("button", { name: "Možda kasnije" }).click();

  await expect(drawer).not.toBeVisible();
  expect(called).toBe(false);
});

test("?survey=online-experience deep-link auto-opens the survey", async ({
  page,
}) => {
  await page.goto("/?survey=online-experience");
  await expect(page.getByRole("dialog", { name: drawerName })).toBeVisible();
});

test("survey drawer has no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();
  await expect(page.getByRole("dialog", { name: drawerName })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});
