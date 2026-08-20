import { expect, test } from "./support/site-test.js";

test("primary navigation exposes the current section", async ({ page }, testInfo) => {
  await page.goto("/thinking/");

  const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
  const mobileMenu = page.locator("details.mobile-nav");

  if (testInfo.project.name === "desktop-chromium") {
    await expect(primaryNavigation).toBeVisible();
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
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Experience" })
    .click();
  await expect(page).toHaveURL(/\/experience\/$/);
});

test("legacy Knowledge URL preserves query parameters and topic hashes", async ({ page }) => {
  await page.goto("/knowledge/?source=legacy#software-systems");

  await expect(page).toHaveURL(/\/explore\/\?source=legacy#software-systems$/);
  await expect(page.locator('[data-explore-topic="software-systems"]')).toHaveAttribute("aria-pressed", "true");
});
