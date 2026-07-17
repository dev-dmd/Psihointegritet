import { expect, test } from "@playwright/test";

test("guided selection quiz recommends therapists", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Pomozite mi da pronađem podršku" })
    .click();

  const drawer = page.getByRole("dialog", { name: "Vođeni izbor podrške" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Korak 1 od 5");

  await drawer.getByRole("button", { name: "Za partnerski odnos" }).click();
  await drawer.getByRole("button", { name: "Odnosi i komunikacija" }).click();
  await drawer.getByRole("button", { name: "Online" }).click();
  await drawer.getByRole("button", { name: "Uveče" }).click();
  await drawer
    .getByRole("button", { name: "Nekoliko predloženih terapeuta" })
    .click();

  await expect(drawer).toContainText("Predlažemo da upoznate");
  // Couples answer recommends Anja and Marjan (deterministic rules).
  const anja = drawer.getByRole("link", { name: /Anja Stamenković/ });
  await expect(anja).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: /Marjan Janković/ }),
  ).toBeVisible();
  // Recommendations link to the real profile route, not a homepage anchor.
  await expect(anja).toHaveAttribute("href", "/tim/anja-stamenkovic");
  await expect(drawer).toContainText("Vaši odgovori se ne čuvaju");

  await drawer.getByRole("button", { name: "Zatvori" }).click();
  await expect(drawer).not.toBeVisible();
});

test("quiz supports going back and the services outcome", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Pomozite mi da pronađem podršku" })
    .click();

  const drawer = page.getByRole("dialog", { name: "Vođeni izbor podrške" });

  await drawer
    .getByRole("button", { name: "Tražim radionicu ili edukaciju" })
    .click();
  await expect(drawer).toContainText("Korak 2 od 5");

  await drawer.getByRole("button", { name: "← Nazad" }).click();
  await expect(drawer).toContainText("Korak 1 od 5");

  await drawer
    .getByRole("button", { name: "Tražim radionicu ili edukaciju" })
    .click();
  await drawer.getByRole("button", { name: "Lični razvoj" }).click();
  await drawer.getByRole("button", { name: "Svejedno" }).click();
  await drawer.getByRole("button", { name: "Fleksibilno" }).click();
  await drawer.getByRole("button", { name: "Usluge i programe" }).click();

  await expect(drawer).toContainText("Usluge i programi za vas");
  await expect(
    drawer.getByRole("link", { name: /Usluge i cenovnik/ }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: /Radionice i programi/ }),
  ).toBeVisible();
});
