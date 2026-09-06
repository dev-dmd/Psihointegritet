import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const survey = {
  stableId: "online-experience",
  version: 1,
  title: "Anketa o iskustvu podrške",
  schema: {
    schemaVersion: 1,
    introTitle: "Pomozite nam da oblikujemo bolje iskustvo podrške",
    introDescription: "Četiri kratka pitanja.",
    allowsFreeText: false,
    questions: [
      {
        questionId: "prior_support",
        prompt: "Da li ste ranije koristili psihološku podršku?",
        options: [
          { optionId: "online", label: "Da, online" },
          { optionId: "never", label: "Ne, nikad" },
        ],
        multi: false,
        optional: false,
      },
      {
        questionId: "format",
        prompt: "Šta vam deluje lakše za prvi razgovor?",
        options: [
          { optionId: "online", label: "Online" },
          { optionId: "in_person", label: "Uživo" },
        ],
        multi: false,
        optional: false,
      },
    ],
  },
};

async function mockResearchApi(page: Page) {
  await page.route("**/api/research/surveys/online-experience", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(survey),
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockResearchApi(page);
});

test("floating question button opens the Research drawer, not Compass or Intake", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(
    "Da li ste ranije koristili psihološku podršku?",
  );
  await expect(drawer).not.toContainText("Za koga tražite podršku?");
  await expect(
    drawer.getByRole("slider", { name: /Visina prozora/ }),
  ).toHaveCount(0);
  await expect(drawer.getByRole("button", { name: "Nastavi" })).toBeDisabled();
  await expect(
    drawer.getByRole("button", { name: "Preskoči pitanje" }),
  ).toHaveCount(0);
});

test("Research drawer is full-height, right-aligned, and closes with Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(500);

  const box = await drawer.boundingBox();
  if (!box) throw new Error("Research drawer has no bounding box");
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  expect(box.width).toBeLessThanOrEqual(520);
  expect(box.x + box.width).toBeCloseTo(viewport.width, 0);
  expect(box.y).toBe(0);
  expect(box.height).toBe(viewport.height);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("last single-select answer is included in the submission payload", async ({
  page,
}) => {
  let body: unknown;
  await page.route("**/api/research/submissions", async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        submissionId: "00000000-0000-0000-0000-000000000001",
        surveyStableId: "online-experience",
        surveyVersion: 1,
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: "Da, online" }).click();
  await drawer.getByRole("button", { name: "Uživo" }).click();

  await expect(drawer).toContainText("Hvala vam");
  expect(body).toMatchObject({
    surveyStableId: "online-experience",
    surface: "research-drawer",
    trigger: "manual",
    answers: [
      { questionId: "prior_support", optionIds: ["online"] },
      { questionId: "format", optionIds: ["in_person"] },
    ],
  });
});

test("?survey=online-experience deep-link auto-opens the survey", async ({
  page,
}) => {
  await page.goto("/?survey=online-experience");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("survey drawer has no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Podelite mišljenje/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(
    results.violations.filter((violation) => violation.impact === "critical"),
  ).toEqual([]);
});
