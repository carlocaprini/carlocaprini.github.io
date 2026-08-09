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

async function captureAnalytics(page) {
  await page.addInitScript(() => {
    window.__analyticsEvents = [];
    window.addEventListener("site:analytics", (event) => {
      window.__analyticsEvents.push(event.detail);
    });
  });
}

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

  await expect(page.getByRole("heading", { name: "Three paths through the ideas." })).toBeVisible();
  await expect(page.getByRole("link", { name: /How do teams make better decisions/ })).toBeVisible();
  await expect(page.locator('[data-explore-topic="ai-and-automation"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-explore-topic-panel="ai-and-automation"]')).toBeVisible();
});

test("Thinking separates guided, recent and complete discovery", async ({ page }) => {
  await page.goto("/thinking/");

  await expect(page.getByRole("heading", { name: "Follow a question through the notes." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The latest notes." })).toBeVisible();
  await expect(page.locator("h2#all-notes")).toHaveText("All notes");
  await expect(page.locator(".thinking-recent-list > li")).toHaveCount(3);
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
    "experience-behind-the-ideas",
    "entry-points",
    "contact"
  ]);
  await expect(page.getByRole("heading", { name: "Problems I can help work through." })).toBeVisible();
  await expect(page.locator(".home-entry-grid").getByRole("link", { name: /Explore/ })).toHaveAttribute("href", "/explore/");
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

test("notes expose curated Questions without promoting topics to sidebar navigation", async ({ page }) => {
  await page.goto("/thinking/waiting-as-product-decision/");

  const questionContext = page.getByRole("complementary", { name: "Part of a bigger question" });
  await expect(questionContext.getByRole("link", { name: "How do teams make better decisions?" })).toHaveAttribute(
    "href",
    "/explore/product-decisions/"
  );
  await expect(page.locator(".article-hero-topics")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Explore topics" })).toHaveCount(0);
});

test("article navigation and system map adapt to smaller screens", async ({ page }, testInfo) => {
  await page.goto("/thinking/why-i-started-building-friday/");

  const pageNavigation = page.getByRole("complementary", { name: "On this page" });
  const desktopSystemMap = page.getByRole("complementary", { name: "Services in this series" });
  const mobileSystemMap = page.locator("details.article-system-map-mobile");

  if (testInfo.project.name === "desktop-chromium") {
    await expect(pageNavigation).toBeVisible();
    await expect(desktopSystemMap).toBeVisible();
    await expect(mobileSystemMap).toBeHidden();
    return;
  }

  await expect(pageNavigation).toBeHidden();
  await expect(desktopSystemMap).toBeHidden();
  await expect(mobileSystemMap).toBeVisible();
  await expect(mobileSystemMap).not.toHaveAttribute("open", "");
  await mobileSystemMap.locator("summary").click();
  await expect(mobileSystemMap).toHaveAttribute("open", "");
  await expect(mobileSystemMap.locator(".article-system-map-item.is-current")).toBeVisible();
});

test("Home uses compact discovery cards below desktop width", async ({ page }, testInfo) => {
  await page.goto("/");

  const firstEntry = page.locator(".home-entry-card-link").first();
  const display = await firstEntry.evaluate((element) => getComputedStyle(element).display);

  if (testInfo.project.name === "desktop-chromium") {
    expect(display).toBe("flex");
  } else {
    expect(display).toBe("grid");
  }

  if (testInfo.project.name === "mobile-chromium") {
    await expect(page.locator(".hero-card-note")).toBeHidden();
  }
});

test("curated Influences return to a relevant Question", async ({ page }) => {
  await page.goto("/influences/");

  await expect(page.locator(".influence-question-link").first()).toBeVisible();
  await expect(page.locator(".influence-question-link").first().getByRole("link")).toHaveAttribute(
    "href",
    /\/explore\/(product-decisions|shared-understanding|ai-and-work)\/$/
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

test("Note views expose the editorial analytics context", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/thinking/i-stopped-trying-to-build-jarvis/");

  await expect.poll(async () => page.evaluate(() => window.__analyticsEvents.length)).toBeGreaterThan(0);
  const contentView = await page.evaluate(() =>
    window.__analyticsEvents.find((event) => event.name === "content_view")
  );

  expect(contentView).toMatchObject({
    name: "content_view",
    parameters: {
      page_type: "article",
      page_topic: "ai-and-automation",
      page_series: "building-my-ai-operating-system",
      page_episode: "1"
    }
  });
});

test("Topic filters emit one semantic selection event", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/explore/");
  await page.locator('[data-explore-topic="software-systems"]').click();

  const event = await page.evaluate(() => window.__analyticsEvents.at(-1));
  expect(event).toMatchObject({
    name: "topic_select",
    parameters: {
      topic: "software-systems",
      interaction: "filter",
      link_context: "explore_topics",
      page_type: "explore"
    }
  });
});

test("Curated Note links emit their discovery context", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const link = page.locator('[data-analytics-event="note_open"]').first();
  await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await link.click();

  const event = await page.evaluate(() => window.__analyticsEvents.at(-1));
  expect(event).toMatchObject({
    name: "note_open",
    parameters: {
      link_context: "home_start_here",
      page_type: "home"
    }
  });
  expect(event.parameters.note_id).toBeTruthy();
});
