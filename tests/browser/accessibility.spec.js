import { expect, test } from "./support/site-test.js";

test("skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#top$/);
});

test("Industry Expertise exposes a semantic, labelled reading structure", async ({ page }) => {
  await page.goto("/industry-expertise/");

  const main = page.locator("main#top");
  await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(main.getByRole("heading", { level: 2 })).toHaveCount(5);
  await expect(page.locator("section[aria-labelledby]")).toHaveCount(5);
  await expect(page.locator(".industry-expertise-topic-list[aria-label]")).toHaveCount(4);
  await expect(page.getByRole("link", { name: /Contact me on LinkedIn.*opens in new tab/ })).toBeVisible();
});
