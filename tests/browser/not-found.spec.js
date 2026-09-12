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
  await expect.poll(async () => page.evaluate(() => window.siteAggregateAnalytics?.buildPageView())).toEqual({
    version: 1,
    event_name: "page_view",
    source_type: "not_found",
    source_id: "/404.html",
    target_type: "not_found",
    target_id: "/404.html",
    link_context: "page_load"
  });
  await expect(page.locator(".site-header")).toBeAttached();
  await expect(page.locator(".site-footer")).toBeAttached();
  await expect(page.locator("[data-consent-settings]")).toBeAttached();
  await expect(page.locator(".not-found-hero")).toHaveClass(/\bhero\b/);
  await expect(page.locator(".not-found-hero")).toHaveClass(/\bhero--compact\b/);
  await expect(page.locator(".not-found-message > .hero-label")).toHaveText("404");
  await expect(page.locator(".not-found-message > .hero-label .hero-label-dot")).toBeVisible();
  await expect(page.locator(".not-found-message > .section-eyebrow")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "This page doesn't exist." })).toBeVisible();
  await expect(page.locator("#not-found-title")).toHaveClass(/\bhero-title--compact\b/);
  await expect(page.locator(".not-found-message > .hero-subtitle")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Go to Thinking" })).toHaveAttribute("href", "/thinking/");
  await expect(page.getByRole("link", { name: "Explore the questions I’m working on" })).toHaveAttribute("href", "/explore/");
  await expect(page.getByRole("link", { name: "How I can help" })).toHaveAttribute("href", "/work/");
  await expect(page.locator(".not-found-work #not-found-work-title")).toHaveClass(/\bsection-title\b/);

  const noteLinks = page.locator(".not-found-notes > li > a");
  await expect(noteLinks).toHaveCount(3);
  expect(await noteLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
    .toEqual(startHereUrls);
  await expect(page.locator(".not-found-notes .not-found-note-arrow")).toHaveCount(3);
  await expect(page.locator(".not-found-notes .not-found-note-arrow").first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".not-found-start .selected-note-summary, .not-found-start .section-description")).toHaveCount(0);
  await expect(page.locator('.not-found-start [data-analytics-event="collection_open"]')).toHaveCount(0);

  const questionLinks = page.locator(".not-found-questions .question-path-item > a");
  await expect(questionLinks).toHaveCount(3);
  expect(await questionLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
    .toEqual(questionUrls);
  await expect(page.locator(".not-found-questions .question-path-content > span, .not-found-questions .section-description")).toHaveCount(0);

  const recoveryColumns = await page.locator(".not-found-recovery-grid").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
  );
  expect(recoveryColumns).toBe(testInfo.project.name === "desktop-chromium" ? 2 : 1);

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
  await expect(page.getByRole("link", { name: "Explore the questions I’m working on" })).toBeVisible();
  await expect(page.getByRole("link", { name: "How I can help" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(await page.evaluate(() => document.documentElement.clientWidth));
});

test("404 typography uses the canonical hero and section primitives", async ({ page }) => {
  const styleSignature = async (selector, properties) => page.locator(selector).first().evaluate((element, names) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(names.map((name) => [name, style[name]]));
  }, properties);

  const labelProperties = ["display", "fontSize", "letterSpacing", "padding", "borderRadius", "textTransform"];
  const titleProperties = ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "marginTop", "marginBottom"];
  const subtitleProperties = ["fontSize", "lineHeight", "color", "maxWidth"];

  await page.goto("/thinking/");
  const canonicalLabel = await styleSignature(".hero .hero-label", labelProperties);
  const canonicalTitle = await styleSignature(".hero .hero-title", titleProperties);
  const canonicalSubtitle = await styleSignature(".hero .hero-subtitle", subtitleProperties);

  await page.goto("/404.html");
  expect(await styleSignature(".not-found-message > .hero-label", labelProperties)).toEqual(canonicalLabel);
  expect(await styleSignature("#not-found-title", titleProperties)).toEqual(canonicalTitle);
  expect(await styleSignature(".not-found-message > .hero-subtitle", subtitleProperties)).toEqual(canonicalSubtitle);

  const sectionTitleProperties = ["fontSize", "fontWeight", "lineHeight"];
  expect(await styleSignature("#not-found-work-title", sectionTitleProperties)).toEqual(
    await styleSignature("#not-found-questions-title", sectionTitleProperties)
  );
});
