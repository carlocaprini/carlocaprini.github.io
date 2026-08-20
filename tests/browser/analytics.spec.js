import { expect, test, captureAnalytics } from "./support/site-test.js";

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
