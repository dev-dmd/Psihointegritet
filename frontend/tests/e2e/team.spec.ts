import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("team page lists every therapist and links to their profile", async ({
  page,
}) => {
  await page.goto("/tim");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Ljudi s kojima ćete raditi.",
    }),
  ).toBeVisible();

  for (const name of ["Maria Bullock", "Elsa Browers", "John Francis"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }

  await page.getByRole("link", { name: /Upoznaj Mariju/ }).click();
  await expect(page).toHaveURL(/\/tim\/maria-bullock$/);
});

test("therapist profile renders the full bio, services and booking strip", async ({
  page,
}) => {
  await page.goto("/tim/john-francis");

  await expect(
    page.getByRole("heading", { level: 1, name: "John Francis" }),
  ).toBeVisible();

  // Bio is never truncated — the therapist's closing paragraph must be present.
  // The 2026-08-10 team (D-074) has one paragraph each until the owner sends
  // the fuller texts, so this asserts the end of that paragraph.
  await expect(page.locator("body")).toContainText(
    "razvoj partnerskog odnosa, stres i lični razvoj",
  );

  // T1: the couples service is „Bračno savetovanje" — the design handoff had
  // the forbidden names.
  await expect(
    page.getByRole("heading", { name: "Bračno savetovanje" }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText("5.500 RSD");

  // Prices per Anja's answers, still flagged as indicative.
  await expect(page.locator("body")).toContainText("Cene su okvirne");

  // T8/D-076: John works from Madison — the handoff hard-coded one city for
  // everyone, and the site's own copy has to name the therapist's own city.
  await expect(page.locator("#zakazivanje")).toContainText(
    "Online ili uživo u Madisonu (Wisconsin)",
  );

  await expect(page.getByRole("link", { name: /Elsa Browers/ })).toBeVisible();
});

test("Savetovanje adolescenata shows no invented duration or price", async ({
  page,
}) => {
  await page.goto("/tim/elsa-browers");

  const adolescents = page
    .locator("#usluge-terapeuta div")
    .filter({
      has: page.getByRole("heading", { name: "Savetovanje adolescenata" }),
    })
    .last();

  await expect(adolescents).toContainText("Informacije u pripremi");
  await expect(adolescents).not.toContainText("RSD");
  await expect(adolescents).not.toContainText("minuta");
});

test("unknown therapist slug returns 404", async ({ page }) => {
  const response = await page.goto("/tim/ne-postoji");
  expect(response?.status()).toBe(404);
});

test("team pages have no critical accessibility violations", async ({
  page,
}) => {
  for (const path of ["/tim", "/tim/maria-bullock"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === "critical",
    );
    expect(critical, `critical a11y violations on ${path}`).toEqual([]);
  }
});

test("booking strip uses the correct grammatical cases", async ({ page }) => {
  // Serbian needs real case forms: „sa Marijom" (instrumental), „u Chicagu"
  // (locative) — and English city names decline too, so „Milwaukee" becomes
  // „Milwaukeeju". Interpolating the nominative renders „sa Maria / u Chicago".
  for (const [slug, expected] of [
    ["maria-bullock", ["sa Marijom", "u Chicagu"]],
    ["elsa-browers", ["sa Elsom", "u Milwaukeeju"]],
    ["john-francis", ["sa Johnom", "u Madisonu"]],
  ] as const) {
    await page.goto(`/tim/${slug}`);
    const strip = page.locator("#zakazivanje");
    for (const phrase of expected) {
      await expect(strip).toContainText(phrase);
    }
  }
});
