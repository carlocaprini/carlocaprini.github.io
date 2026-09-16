import { readFile } from "node:fs/promises";
import { expect, test } from "./support/site-test.js";

const sitemapText = await readFile("_site/sitemap.txt", "utf8");
const publicRoutes = sitemapText
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((url) => new URL(url).pathname);

test("Industry Expertise is part of the public indexable route set", async ({ page }) => {
  expect(publicRoutes).toContain("/industry-expertise/");

  await page.goto("/industry-expertise/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
});

for (const route of publicRoutes) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.ok()).toBe(true);
    await expect(page.locator("main#top")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${route === "/" ? "/$" : route.replaceAll("/", "\\/") + "$"}`)
    );

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  });
}
