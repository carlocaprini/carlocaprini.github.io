import { readFile } from "node:fs/promises";
import { expect, expectRuntimeErrors, test } from "./support/site-test.js";

const generated404 = await readFile("_site/404.html", "utf8");
const sitemapXml = await readFile("_site/sitemap.xml", "utf8");
const sitemapText = await readFile("_site/sitemap.txt", "utf8");
const startHereSource = await readFile("_data/start_here.yml", "utf8");
const questionsSource = await readFile("_data/questions.yml", "utf8");
const startHereUrls = [...startHereSource.matchAll(/^\s+- url: (\S+)$/gm)].map((match) => match[1]);
const questionUrls = [...questionsSource.matchAll(/^  - slug: (\S+)$/gm)]
  .map((match) => `/explore/${match[1]}/`);

test("custom 404 output preserves the site shell and focused recovery hierarchy", async ({ page }, testInfo) => {
  expect(generated404).toContain('<div class="page not-found-page">');
  expect(sitemapXml).not.toContain("/404.html");
  expect(sitemapText).not.toContain("/404.html");
  expect(startHereUrls).toHaveLength(3);
  expect(questionUrls).toHaveLength(3);

  expectRuntimeErrors(page, ["console: Failed to load resource: the server responded with a status of 404 (Not Found)"]);
  const response = await page.goto("/a-clearly-missing-page/");
  expect(response?.status()).toBe(404);
  expect(await response?.text()).toBe(generated404);
  await expect(page).toHaveTitle("Page not found | Carlo Caprini");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(page.locator("body")).toHaveAttribute("data-analytics-page-type", "not_found");
  await expect(page.locator(".site-header")).toBeAttached();
  await expect(page.locator(".site-footer")).toBeAttached();
  await expect(page.locator("[data-consent-settings]")).toBeAttached();
  await expect(page.getByRole("heading", { name: "This page doesn't exist." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Go to Thinking" })).toHaveAttribute("href", "/thinking/");
  await expect(page.getByRole("link", { name: "How I can help" })).toHaveAttribute("href", "/work/");

  const noteLinks = page.locator(".not-found-notes > li > a");
  await expect(noteLinks).toHaveCount(3);
  expect(await noteLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
    .toEqual(startHereUrls);

  const questionLinks = page.locator(".not-found-questions .question-path-item > a");
  await expect(questionLinks).toHaveCount(3);
  expect(await questionLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
    .toEqual(questionUrls);

  const motif = page.locator('.not-found-motif[aria-hidden="true"] svg');
  await expect(motif).toBeAttached();
  await expect(motif).toHaveAttribute("focusable", "false");
  await expect(page.locator(".not-found-motif .motif-path--primary")).toHaveCount(3);
  await expect(page.locator(".not-found-visual, .not-found-page img")).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.documentWidth).toBe(dimensions.viewportWidth);

  const mobileMenu = page.locator("details.mobile-nav");
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(mobileMenu).toBeHidden();
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
    await mobileMenu.locator("summary").click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Work" })).toBeVisible();
  }
});

test("recovery remains usable without the decorative motif", async ({ page }) => {
  expectRuntimeErrors(page, ["console: Failed to load resource: the server responded with a status of 404 (Not Found)"]);
  await page.goto("/another-missing-page/");
  await page.locator(".not-found-motif").evaluate((element) => element.remove());

  await expect(page.getByRole("heading", { name: "This page doesn't exist." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Thinking" })).toBeVisible();
  await expect(page.locator(".not-found-notes > li")).toHaveCount(3);
  await expect(page.locator(".not-found-questions .question-path-item")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "How I can help" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(await page.evaluate(() => document.documentElement.clientWidth));
});
