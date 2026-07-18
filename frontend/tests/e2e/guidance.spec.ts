import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const drawerName = "Vođeni izbor podrške";

test("header Zakazi termin opens the chooser, then a known therapist goes to a profile", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Zakaži termin" }).first().click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Kako želite da pronađete termin?");

  // Returning clients skip the quiz entirely.
  await drawer.getByRole("link", { name: /Marija Stamenković/ }).click();
  await expect(page).toHaveURL(/\/tim\/marija-stamenkovic$/);
});

test("hero button opens the quiz directly (no chooser)", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Pitanje 1 od 5");
  await expect(drawer).not.toContainText("Kako želite da pronađete termin?");
  // The safety notice is present on the questions.
  await expect(drawer).toContainText(
    "ne postavlja dijagnozu i nije hitna služba",
  );
});

test("full quiz produces an explainable match that links to the profile", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: drawerName });

  await drawer.getByRole("button", { name: "Za mene — odrasla osoba" }).click();
  await drawer.getByRole("button", { name: "26–45" }).click();
  await drawer.getByRole("button", { name: "Roditeljstvo" }).click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Najbolje stručno uklapanje" })
    .click();

  await expect(drawer).toContainText("Predlog na osnovu vaših odgovora");
  // Reasons are sentences, never a numeric score.
  await expect(drawer).toContainText(
    "oblast rada odgovara izabranim potrebama",
  );
  await expect(drawer).not.toContainText("%");

  const primary = drawer.getByRole("link", { name: /Stamenković/ }).first();
  await expect(primary).toBeVisible();
  await primary.click();
  await expect(page).toHaveURL(/\/tim\/(anja|marija)-stamenkovic$/);
});

test("adolescent routes to Marija with the parent/guardian note", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: drawerName });

  await drawer.getByRole("button", { name: "Za adolescenta" }).click();
  await drawer.getByRole("button", { name: "16–17" }).click();
  await drawer.getByRole("button", { name: "Izazovi adolescencije" }).click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Najbolje stručno uklapanje" })
    .click();

  await expect(
    drawer.getByRole("link", { name: /Marija Stamenković/ }),
  ).toBeVisible();
  await expect(drawer).toContainText("uz roditelja ili staratelja");
});

test("crisis recovery hands off to the team, never auto-assigned", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: drawerName });

  await drawer.getByRole("button", { name: "Za mene — odrasla osoba" }).click();
  await drawer.getByRole("button", { name: "26–45" }).click();
  await drawer
    .getByRole("button", {
      name: "Oporavak nakon nasilja ili kriznog iskustva",
    })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Najbolje stručno uklapanje" })
    .click();

  await expect(drawer).toContainText("Tim potvrđuje najbolje uklapanje");
  await expect(drawer).toContainText("Nedodeljen zahtev");
});

test("Rad sa kompanijama ends the quiz and offers the B2B page", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: drawerName });

  await drawer.getByRole("button", { name: "Rad sa kompanijama" }).click();

  // B2B branch: the „Program podrške zaposlenima" configurator + a page link.
  await expect(drawer).toContainText("Program podrške zaposlenima");
  await drawer.getByRole("link", { name: "Saznajte više" }).click();
  await expect(page).toHaveURL(/\/rad-sa-kompanijama$/);
});

test("back navigation works through the quiz", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: drawerName });

  await drawer.getByRole("button", { name: "Za mene — odrasla osoba" }).click();
  await expect(drawer).toContainText("Pitanje 2 od 5");
  await drawer.getByRole("button", { name: "← Nazad" }).click();
  await expect(drawer).toContainText("Pitanje 1 od 5");
});

test("drawer has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  await expect(page.getByRole("dialog", { name: drawerName })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});
