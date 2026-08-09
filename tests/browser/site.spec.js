import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const publicRoutes = (await readFile("_site/sitemap.txt", "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((url) => new URL(url).pathname);

const seriesRoutes = [
  "/thinking/i-stopped-trying-to-build-jarvis/",
  "/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/",
  "/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/",
  "/thinking/why-i-started-building-friday/"
];

const runtimeErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" })
  );
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
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

test("Explore exposes curated questions and stable topic hashes", async ({ page }) => {
  await page.goto("/explore/#ai-and-automation");

  await expect(page.getByRole("heading", { name: "Three paths through the work." })).toBeVisible();
  await expect(page.getByRole("link", { name: /How do teams make better decisions/ })).toBeVisible();
  await expect(page.locator('[data-explore-topic="ai-and-automation"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-explore-topic-panel="ai-and-automation"]')).toBeVisible();
});

test("Thinking separates guided, recent and complete discovery", async ({ page }) => {
  await page.goto("/thinking/");

  await expect(page.getByRole("heading", { name: "Follow a question through the notes." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The latest notes." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All thinking" })).toBeVisible();
  await expect(page.locator(".thinking-recent-list > li")).toHaveCount(6);
});

test("Home follows the discovery-first content order", async ({ page }) => {
  await page.goto("/");

  const sectionIds = await page.locator(".home-page > section[id]").evaluateAll((sections) =>
    sections.map((section) => section.id)
  );
  expect(sectionIds).toEqual([
    "selected-notes",
    "questions",
    "where-i-can-help",
    "featured-series",
    "experience-behind-the-work",
    "explore-thinking",
    "contact"
  ]);
  await expect(page.getByRole("heading", { name: "Problems I can help work through." })).toBeVisible();
  await expect(page.locator(".home-explore-grid").getByRole("link", { name: /Explore/ })).toHaveAttribute("href", "/explore/");
});

test("legacy Knowledge URL preserves query parameters and topic hashes", async ({ page }) => {
  await page.goto("/knowledge/?source=legacy#software-systems");

  await expect(page).toHaveURL(/\/explore\/\?source=legacy#software-systems$/);
  await expect(page.locator('[data-explore-topic="software-systems"]')).toHaveAttribute("aria-pressed", "true");
});

test("question pages connect Thinking, Influences and Experience", async ({ page }) => {
  await page.goto("/explore/product-decisions/");

  await expect(page.getByRole("heading", { name: "Notes that develop the question." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ideas that sharpen the question." })).toBeVisible();
  await expect(page.getByRole("link", { name: /See the experience behind this question/ })).toHaveAttribute(
    "href",
    "/experience/#product-direction"
  );
});

test("skip link reaches the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#top$/);
});

for (const route of seriesRoutes) {
  test(`${route} explains its place in the series`, async ({ page }) => {
    await page.goto(route);

    const context = page.getByRole("complementary", { name: "Series context" });
    await expect(context).toBeVisible();
    await expect(context.getByRole("link", { name: "About this series" })).toHaveAttribute(
      "href",
      "/series/building-my-ai-operating-system/"
    );
    await expect(context.locator(":scope > p")).toHaveCount(3);
  });
}

test("series navigation connects adjacent episodes", async ({ page }) => {
  await page.goto(seriesRoutes[1]);

  await expect(page.getByRole("link", { name: /Previous episode/ })).toHaveAttribute(
    "href",
    seriesRoutes[0]
  );
  await expect(page.getByRole("link", { name: /Next episode/ })).toHaveAttribute(
    "href",
    seriesRoutes[2]
  );
});

test("featured series motion stops when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/thinking/");

  const animationNames = await page.locator(".thinking-series-preview").evaluate((element) => ({
    panel: getComputedStyle(element).animationName,
    before: getComputedStyle(element, "::before").animationName,
    after: getComputedStyle(element, "::after").animationName
  }));

  expect(animationNames).toEqual({
    panel: "none",
    before: "none",
    after: "none"
  });
});
