import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const drawerName = "Vođeni izbor podrške";

async function openQuestionnaire(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  return page.getByRole("dialog", { name: drawerName });
}

test("header Zakazi termin opens the chooser, then a known therapist goes to a profile", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Zakaži termin" }).first().click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Kako želite da pronađete termin?");

  // Returning clients skip the questionnaire entirely.
  await drawer.getByRole("link", { name: /Marija Stamenković/ }).click();
  await expect(page).toHaveURL(/\/tim\/marija-stamenkovic$/);
});

test("chooser quiz option opens the questions directly, without an intro step", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zakaži termin" }).first().click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await drawer
    .getByRole("button", { name: "Pomozite mi da pronađem terapeuta" })
    .click();

  await expect(drawer).toContainText("Pitanje 1 od 5");
  // Chooser entry keeps a way back from question 1.
  await drawer.getByRole("button", { name: "← Nazad" }).click();
  await expect(drawer).toContainText("Kako želite da pronađete termin?");
});

test("hero button opens the questions immediately, with the non-diagnostic note", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await expect(drawer).toBeVisible();
  // No intro screen, no chooser — question 1 straight away.
  await expect(drawer).toContainText("Pitanje 1 od 5");
  await expect(drawer).not.toContainText("Kako želite da pronađete termin?");
  // The non-diagnostic note and the safety notice sit above the first question.
  await expect(drawer).toContainText("Upitnik nije dijagnostički alat");
  await expect(drawer).toContainText(
    "ne postavlja dijagnozu i nije hitna služba",
  );
});

test("burnout produces Anja as a single primary with plain-language reasons", async ({
  page,
}) => {
  const drawer = await openQuestionnaire(page);

  await drawer.getByRole("button", { name: "Burnout" }).click();
  await drawer.getByRole("button", { name: "Sam/a" }).click();
  await drawer.getByRole("button", { name: "Ne", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Naučiti kako da se nosim sa emocijama" })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  await expect(drawer).toContainText("Predlog na osnovu vaših odgovora");
  await expect(drawer).toContainText(
    "Preporučena usluga: Individualna psihoterapija",
  );
  await expect(drawer).toContainText("Anja Stamenković");
  // Reasons are sentences, never a numeric score.
  await expect(drawer).toContainText("Radi sa temama burnouta i stresa.");
  await expect(drawer).not.toContainText("%");
  await expect(drawer).not.toContainText("poena");

  // One clear leader → one primary, the runner-up is behind a reveal.
  await expect(
    drawer.getByRole("button", { name: "Pogledajte i drugu preporuku" }),
  ).toBeVisible();

  await drawer.getByRole("link", { name: "Pogledajte profil" }).click();
  await expect(page).toHaveURL(/\/tim\/anja-stamenkovic$/);
});

test("adolescent + parent routes to Marija with the child-age step and minor note", async ({
  page,
}) => {
  const drawer = await openQuestionnaire(page);

  await drawer.getByRole("button", { name: "Odnos sa adolescentom" }).click();
  await drawer.getByRole("button", { name: "Roditelj i dete" }).click();

  // Conditional step appears only for „Roditelj i dete".
  await expect(drawer).toContainText("Kojoj uzrasnoj grupi pripada dete?");
  await expect(drawer).toContainText("Pitanje 3 od 6");
  await drawer.getByRole("button", { name: "16–17 godina" }).click();

  await drawer.getByRole("button", { name: "Ne", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Poboljšati odnos sa detetom" })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  await expect(drawer).toContainText(
    "Preporučena usluga: Roditeljsko savetovanje",
  );
  await expect(drawer).toContainText("Marija Stamenković");
  await expect(drawer).toContainText("uz roditelja ili staratelja");
});

test("a depression tie shows two therapists side by side", async ({ page }) => {
  const drawer = await openQuestionnaire(page);

  await drawer.getByRole("button", { name: "Depresivno raspoloženje" }).click();
  await drawer.getByRole("button", { name: "Sam/a" }).click();
  await drawer.getByRole("button", { name: "Ne", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Nisam siguran/na", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  await expect(drawer).toContainText(
    "Oba terapeuta rade sa izabranim oblastima",
  );
  await expect(drawer).toContainText("Marija Stamenković");
  await expect(drawer).toContainText("Marjan Janković");
});

test("Drugo asks for optional context and never ends without a recommendation", async ({
  page,
}) => {
  const drawer = await openQuestionnaire(page);

  await drawer.getByRole("button", { name: "Drugo", exact: true }).click();
  // No auto-advance: the optional free-text field + explicit „Dalje".
  await expect(drawer).toContainText(
    "ukratko opišite šta vam je trenutno važno",
  );
  await drawer
    .getByLabel(/ukratko opišite šta vam je trenutno važno/)
    .fill("Teško mi je da spavam.");
  await drawer.getByRole("button", { name: "Dalje" }).click();

  await drawer.getByRole("button", { name: "Sam/a" }).click();
  await drawer.getByRole("button", { name: "Ne", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Nisam siguran/na", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  // Never "no therapist found" — a recommendation plus the manual-review note.
  await expect(drawer).toContainText("Predlog na osnovu vaših odgovora");
  await expect(drawer).toContainText("tim će dodatno pregledati vaš zahtev");
});

test("the team-review path offers an unassigned request form", async ({
  page,
}) => {
  const drawer = await openQuestionnaire(page);

  await drawer
    .getByRole("button", { name: "Ne znam tačno, želim razgovor" })
    .click();
  await drawer
    .getByRole("button", { name: "Nisam siguran/na", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Ne", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Nisam siguran/na", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  await drawer
    .getByRole("button", { name: "Želim da tim pregleda moj zahtev" })
    .click();

  await expect(drawer).toContainText("Tim potvrđuje najbolje uklapanje");
  await expect(drawer).toContainText("Nedodeljen zahtev");
  await expect(drawer.getByLabel("Ime i prezime")).toBeVisible();
});

test("back navigation works through the questionnaire", async ({ page }) => {
  const drawer = await openQuestionnaire(page);

  await drawer.getByRole("button", { name: "Burnout" }).click();
  await expect(drawer).toContainText("Pitanje 2 od 5");
  await drawer.getByRole("button", { name: "← Nazad" }).click();
  await expect(drawer).toContainText("Pitanje 1 od 5");
  // Direct entry (hero) has nothing before question 1 — no back button.
  await expect(drawer.getByRole("button", { name: "← Nazad" })).toHaveCount(0);
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
