import { expect, test } from "./support/site-test.js";

test("primary navigation exposes the current section", async ({ page }, testInfo) => {
  await page.goto("/thinking/");

  const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
  const mobileMenu = page.locator("details.mobile-nav");
  const expectedOrder = ["Home", "Explore", "Thinking", "Work", "Experience", "Influences", "Contact"];

  await expect(page.locator(".site-header .brand")).toHaveText("Carlo Caprini");
  await expect(page.locator(".site-header .tagline")).toHaveCount(0);

  if (testInfo.project.name === "desktop-chromium") {
    await expect(primaryNavigation).toBeVisible();
    expect(await primaryNavigation.getByRole("link").allTextContents()).toEqual(expectedOrder);
    await expect(primaryNavigation.getByRole("link", { name: "Thinking" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(mobileMenu).toBeHidden();
    return;
  }

  await expect(primaryNavigation).toBeHidden();
  await expect(mobileMenu.getByText("Menu", { exact: true })).toBeVisible();
  await mobileMenu.getByText("Menu", { exact: true }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  expect(await mobileNavigation.getByRole("link").allTextContents()).toEqual(expectedOrder);
  await mobileNavigation
    .getByRole("link", { name: "Experience" })
    .click();
  await expect(page).toHaveURL(/\/experience\/$/);
});

test("legacy Knowledge URL preserves query parameters and topic hashes", async ({ page }) => {
  await page.goto("/knowledge/?source=legacy#software-systems");

  await expect(page).toHaveURL(/\/explore\/\?source=legacy#software-systems$/);
  await expect(page.locator('[data-explore-topic="software-systems"]')).toHaveAttribute("aria-pressed", "true");
});

test("Work is a first-class destination with a current-page state", async ({ page }, testInfo) => {
  await page.goto("/work/");

  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Work" }))
      .toHaveAttribute("aria-current", "page");
    return;
  }

  await page.locator("details.mobile-nav summary").click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Work" }))
    .toHaveAttribute("aria-current", "page");
});

test("Series pages belong to Explore navigation", async ({ page }, testInfo) => {
  await page.goto("/series/product-judgment-in-practice/");

  const navigation = testInfo.project.name === "desktop-chromium"
    ? page.getByRole("navigation", { name: "Primary navigation" })
    : page.getByRole("navigation", { name: "Mobile navigation" });
  if (testInfo.project.name !== "desktop-chromium") {
    await page.locator("details.mobile-nav summary").click();
  }

  await expect(navigation.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Thinking" })).not.toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Series" })).toHaveCount(0);
});
