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

test("Optional analytics stays unloaded until consent is granted", async ({ page }) => {
  await page.goto("/");

  const consent = page.getByRole("complementary", { name: "Help me understand how the site is used" });
  await expect(consent).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");

  await consent.getByRole("button", { name: "No thanks" }).click();
  await expect(consent).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.siteConsent?.status())).toBe("denied");
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Cookie settings" }).click();
  await expect(consent).toBeVisible();
  await expect(consent.getByRole("button", { name: "No thanks" })).toBeFocused();
});

test("Local previews never load Analytics, including production builds", async ({ page }) => {
  await page.goto("/thinking/i-stopped-trying-to-build-jarvis/");
  await page.evaluate(() => {
    document.body.dataset.analyticsEnabled = "true";
    document.body.dataset.analyticsId = "G-TEST";
    document.body.dataset.analyticsHostname = "carlocaprini.github.io";
  });

  await page.getByRole("button", { name: "Accept analytics" }).click();

  await expect.poll(async () => page.evaluate(() => window.siteConsent?.status())).toBe("granted");
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");
});

test("Local previews never send proprietary aggregate measurement", async ({ page }) => {
  const requests = [];
  await page.route("https://measure.example.test/**", async (route) => {
    requests.push(route.request().postData());
    await route.fulfill({ status: 204 });
  });

  await page.goto("/thinking/i-stopped-trying-to-build-jarvis/");
  await page.evaluate(async () => {
    document.body.dataset.aggregateAnalyticsEnabled = "true";
    document.body.dataset.aggregateAnalyticsEndpoint = "https://measure.example.test/v1/measure";

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/assets/js/aggregate-analytics.js?local-guard-test=1";
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });

    window.dispatchEvent(new CustomEvent("site:analytics", {
      detail: {
        name: "note_open",
        parameters: {
          page_type: "thinking",
          page_id: "/thinking/",
          note_id: "/thinking/i-stopped-trying-to-build-jarvis/",
          link_context: "thinking_start_here"
        }
      }
    }));
  });

  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.siteAggregateAnalytics.enabled)).toBe(false);
  expect(requests).toEqual([]);
});

test("Aggregate measurement maps semantic events without personal fields", async ({ page }) => {
  await page.goto("/thinking/?utm_source=linkedin&utm_medium=social&utm_campaign=building_my_ai_operating_system&utm_content=episode_05_single_image");

  const mapped = await page.evaluate(() => ({
    note: window.siteAggregateAnalytics.buildEvent("note_open", {
      page_type: "thinking",
      page_id: "/thinking/",
      note_id: "/thinking/i-stopped-trying-to-build-jarvis/",
      link_context: "thinking_start_here",
      ignored_free_text: "This must not leave the browser"
    }),
    consent: window.siteAggregateAnalytics.buildConsentChoice("denied"),
    pageView: window.siteAggregateAnalytics.buildPageView(),
    campaign: window.siteAggregateAnalytics.buildCampaignLanding(),
    missingCampaign: window.siteAggregateAnalytics.buildCampaignLanding("?utm_source=linkedin&utm_medium=social"),
    invalidCampaign: window.siteAggregateAnalytics.buildCampaignLanding("?utm_source=linkedin&utm_medium=organic_social&utm_campaign=building_my_ai_operating_system&utm_content=episode_05_single_image")
  }));

  expect(mapped.note).toEqual({
    version: 1,
    event_name: "note_open",
    source_type: "thinking",
    source_id: "/thinking/",
    target_type: "note",
    target_id: "/thinking/i-stopped-trying-to-build-jarvis/",
    link_context: "thinking_start_here"
  });
  expect(mapped.note).not.toHaveProperty("ignored_free_text");
  expect(mapped.consent).toEqual({
    version: 1,
    event_name: "consent_choice",
    source_type: "site",
    source_id: "/",
    target_type: "consent",
    target_id: "denied",
    link_context: "consent_panel"
  });
  expect(mapped.pageView).toMatchObject({
    event_name: "page_view",
    source_type: "thinking",
    target_type: "thinking",
    link_context: "page_load"
  });
  expect(mapped.campaign).toEqual({
    version: 1,
    event_name: "campaign_landing",
    landing_type: "thinking",
    landing_id: "/thinking/",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_campaign: "building_my_ai_operating_system",
    utm_content: "episode_05_single_image"
  });
  expect(mapped.missingCampaign).toBeNull();
  expect(mapped.invalidCampaign).toBeNull();
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
      page_type: "note",
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

test("Editorial collection links retain their entry point", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const link = page.locator('[data-analytics-event="collection_open"][data-analytics-collection="explore"]:visible').first();
  await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await link.click();

  const event = await page.evaluate(() => window.__analyticsEvents.at(-1));
  expect(event).toMatchObject({
    name: "collection_open",
    parameters: {
      collection: "explore",
      link_context: "home_hero",
      page_type: "home"
    }
  });
});

test("Contact section intent is distinct from opening a channel", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const sectionLink = page.locator('[data-analytics-event="contact_section_open"]:visible').first();
  await sectionLink.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await sectionLink.click();

  const sectionEvent = await page.evaluate(() => window.__analyticsEvents.at(-1));
  expect(sectionEvent).toMatchObject({
    name: "contact_section_open",
    parameters: { page_type: "home" }
  });

  const channelLink = page.locator('[data-analytics-event="contact_open"]').first();
  await channelLink.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await channelLink.click();

  const channelEvent = await page.evaluate(() => window.__analyticsEvents.at(-1));
  expect(channelEvent).toMatchObject({
    name: "contact_open",
    parameters: {
      contact_method: "linkedin",
      link_context: "home_contact",
      page_type: "home"
    }
  });
});
