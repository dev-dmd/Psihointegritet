import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.goto("/");

  // Two triggers exist (hero header + sticky bar); at the top of the page
  // the hero header burger is the interactive one.
  await page.getByRole("button", { name: "Otvori meni" }).first().click();

  const drawer = page.getByRole("dialog", { name: "Meni" });
  await expect(drawer).toBeVisible();

  await drawer.getByRole("link", { name: "Terapeuti" }).click();

  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/\/tim$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Ljudi s kojima ćete raditi.",
    }),
  ).toBeVisible();
});

test("mobile menu opens from the sticky header after scrolling", async ({
  page,
}) => {
  await page.goto("/");

  // Scroll far enough that the sticky pill slides in over the content.
  await page.evaluate(() => window.scrollTo(0, 1200));
  const stickyBurger = page.getByRole("button", { name: "Otvori meni" }).nth(1);
  await expect(stickyBurger).toBeVisible();

  await stickyBurger.click();

  const drawer = page.getByRole("dialog", { name: "Meni" });
  await expect(drawer).toBeVisible();
  // Regression: the drawer must cover the viewport edge, not render inside
  // the transformed sticky pill (transform creates a containing block for
  // position: fixed descendants).
  await drawer.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  );
  const box = await drawer.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(Math.round(box.y)).toBe(0);
    expect(Math.round(box.x + box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);
  }

  await drawer.getByRole("button", { name: "Zatvori meni" }).click();
  await expect(drawer).not.toBeVisible();
});

test("key public routes have no horizontal overflow on mobile", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/pronadji-podrsku",
    "/zakazi",
    "/usluge",
    "/usluge/individualna-psihoterapija",
    "/tim",
    "/tim/anja-stamenkovic",
    "/radionice",
    "/cene",
    "/podrska-roditeljima",
    "/rad-sa-kompanijama",
  ]) {
    await page.goto(path);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const documentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(
      documentWidth,
      `${path} should fit the mobile viewport`,
    ).toBeLessThanOrEqual(viewport!.width);
  }
});
