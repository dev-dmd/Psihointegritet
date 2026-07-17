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

  for (const name of [
    "Anja Stamenković",
    "Marija Stamenković",
    "Marjan Janković",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }

  await page.getByRole("link", { name: /Upoznaj Anju/ }).click();
  await expect(page).toHaveURL(/\/tim\/anja-stamenkovic$/);
});

test("therapist profile renders the full bio, services and booking strip", async ({
  page,
}) => {
  await page.goto("/tim/marjan-jankovic");

  await expect(
    page.getByRole("heading", { level: 1, name: "Marjan Janković" }),
  ).toBeVisible();

  // Bio is never truncated — the therapist's closing paragraph must be present.
  await expect(page.locator("body")).toContainText(
    "temelj svake istinske promene",
  );

  // T1/T2: the couples service is „Bračno savetovanje", counseling is
  // „Psihoterapijsko savetovanje" — the design handoff had the forbidden names.
  await expect(
    page.getByRole("heading", { name: "Bračno savetovanje" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Psihoterapijsko savetovanje" }),
  ).toBeVisible();

  // T7: prices must be flagged as indicative.
  await expect(page.locator("body")).toContainText("Cene su okvirne");

  // T8: Marjan works from Leskovac — the handoff hard-coded Niš everywhere.
  await expect(page.locator("#zakazivanje")).toContainText(
    "Online ili uživo u Leskovcu",
  );

  await expect(
    page.getByRole("link", { name: /Marija Stamenković/ }),
  ).toBeVisible();
});

test("Roditeljstvo shows no invented duration or price", async ({ page }) => {
  await page.goto("/tim/anja-stamenkovic");

  const parenting = page
    .locator("#usluge-terapeuta div")
    .filter({ has: page.getByRole("heading", { name: "Roditeljstvo" }) })
    .last();

  await expect(parenting).toContainText("online ili uživo");
  await expect(parenting).not.toContainText("RSD");
  await expect(parenting).not.toContainText("minuta");
});

test("unknown therapist slug returns 404", async ({ page }) => {
  const response = await page.goto("/tim/ne-postoji");
  expect(response?.status()).toBe(404);
});

test("team pages have no critical accessibility violations", async ({
  page,
}) => {
  for (const path of ["/tim", "/tim/anja-stamenkovic"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === "critical",
    );
    expect(critical, `critical a11y violations on ${path}`).toEqual([]);
  }
});

test("booking strip uses the correct grammatical cases", async ({ page }) => {
  // Serbian needs real case forms: „sa Anjom" (instrumental), „u Nišu"
  // (locative). Interpolating the nominative would render „sa Anja / u Niš".
  for (const [slug, expected] of [
    ["anja-stamenkovic", ["sa Anjom", "u Nišu"]],
    ["marija-stamenkovic", ["sa Marijom", "u Leskovcu"]],
    ["marjan-jankovic", ["sa Marjanom", "u Leskovcu"]],
  ] as const) {
    await page.goto(`/tim/${slug}`);
    const strip = page.locator("#zakazivanje");
    for (const phrase of expected) {
      await expect(strip).toContainText(phrase);
    }
  }
});
