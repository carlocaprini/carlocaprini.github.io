import { expect, test, captureAnalytics } from "./support/site-test.js";

test("Semantic GA4 events discard undeclared parameters and private URL components", async ({ page }) => {
  await page.goto("/thinking/i-stopped-trying-to-build-jarvis/");
  const recorded = await page.evaluate(() => {
    const events = [];
    window.gtag = (...args) => events.push(args);
    window.siteAnalytics.track("reading_open", {
      destination: "https://publisher.example/article/?email=private@example.test#private",
      link_context: "note_body", email: "private@example.test", user_id: "private",
      hostname: "technical", enabled: "true", note_id: "wrong_event",
      reading_id: { answer: "private learner text" }
    });
    window.dispatchEvent(new CustomEvent("site:analytics-ready"));
    delete window.gtag;
    return events;
  });
  expect(recorded[0]).toEqual(["event", "reading_open", {
    link_context: "note_body", destination: "https://publisher.example/article/"
  }]);
  for (const key of ["enabled", "id", "hostname", "content"]) expect(recorded[1][2]).not.toHaveProperty(key);
  expect(JSON.stringify(recorded)).not.toContain("private");
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
    githubProfile: window.siteAggregateAnalytics.buildCampaignLanding("?utm_source=github&utm_medium=profile&utm_campaign=profile&utm_content=profile_readme"),
    missingCampaign: window.siteAggregateAnalytics.buildCampaignLanding("?utm_source=linkedin&utm_medium=social"),
    invalidCampaign: window.siteAggregateAnalytics.buildCampaignLanding("?utm_source=linkedin&utm_medium=organic_social&utm_campaign=building_my_ai_operating_system&utm_content=episode_05_single_image"),
    work: window.siteAggregateAnalytics.buildEvent("work_open", {
      page_type: "home",
      page_id: "/",
      link_context: "home_selected_work"
    }),
    workSection: window.siteAggregateAnalytics.buildEvent("work_section_view", {
      page_type: "work",
      page_id: "/work/",
      work_section: "review",
      link_context: "work_page"
    }),
    socialProfile: window.siteAggregateAnalytics.buildEvent("social_profile_open", {
      page_type: "note",
      page_id: "/thinking/waiting-as-product-decision/",
      platform: "linkedin",
      link_context: "article_signature"
    })
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
  expect(mapped.githubProfile).toEqual({
    version: 1,
    event_name: "campaign_landing",
    landing_type: "thinking",
    landing_id: "/thinking/",
    utm_source: "github",
    utm_medium: "profile",
    utm_campaign: "profile",
    utm_content: "profile_readme"
  });
  expect(mapped.missingCampaign).toBeNull();
  expect(mapped.invalidCampaign).toBeNull();
  expect(mapped.work).toEqual({
    version: 1,
    event_name: "work_open",
    source_type: "home",
    source_id: "/",
    target_type: "work",
    target_id: "work",
    link_context: "home_selected_work"
  });
  expect(mapped.workSection).toEqual({
    version: 1,
    event_name: "work_section_view",
    source_type: "work",
    source_id: "/work/",
    target_type: "work_section",
    target_id: "review",
    link_context: "work_page"
  });
  expect(mapped.socialProfile).toEqual({
    version: 1,
    event_name: "social_profile_open",
    source_type: "note",
    source_id: "/thinking/waiting-as-product-decision/",
    target_type: "social_profile",
    target_id: "linkedin",
    link_context: "article_signature"
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

test("Full-size article images are not misclassified as external readings", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/");

  const figureLink = page.locator(".article-figure-link");
  await expect(figureLink).not.toHaveAttribute("data-analytics-event", /.+/);
  await figureLink.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));

  const eventCount = await page.evaluate(() => window.__analyticsEvents.length);
  await figureLink.click();
  expect(await page.evaluate(() => window.__analyticsEvents.length)).toBe(eventCount);
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

test("404 recovery links distinguish every onward route", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/404.html");

  const cases = [
    [
      page.getByRole("link", { name: "Back to home" }),
      "collection_open",
      { collection: "home", link_context: "not_found_primary" }
    ],
    [
      page.getByRole("link", { name: "Go to Thinking" }),
      "collection_open",
      { collection: "thinking", link_context: "not_found_primary" }
    ],
    [
      page.locator('.not-found-start [data-analytics-link-context="not_found_start_here"][data-analytics-event="collection_open"]'),
      "collection_open",
      { collection: "thinking", link_context: "not_found_start_here" }
    ],
    [page.locator(".not-found-notes > li > a").first(), "note_open", { link_context: "not_found_start_here" }],
    [
      page.locator(".not-found-questions .question-path-item > a").nth(0),
      "question_open",
      { question_id: "product-decisions", link_context: "not_found_questions" }
    ],
    [
      page.locator(".not-found-questions .question-path-item > a").nth(1),
      "question_open",
      { question_id: "shared-understanding", link_context: "not_found_questions" }
    ],
    [
      page.locator(".not-found-questions .question-path-item > a").nth(2),
      "question_open",
      { question_id: "ai-and-work", link_context: "not_found_questions" }
    ],
    [page.getByRole("link", { name: "How I can help" }), "work_open", { link_context: "not_found_work" }]
  ];

  for (const [link, name, parameters] of cases) {
    await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault(), { once: true }));
    await link.click();
    const event = await page.evaluate(() => window.__analyticsEvents.at(-1));
    expect(event).toMatchObject({
      name,
      parameters: {
        page_type: "not_found",
        page_id: "/404.html",
        ...parameters
      }
    });
  }
});

test("Editorial collection links retain their entry point", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const link = page.locator('[data-analytics-event="collection_open"][data-analytics-collection="explore"][data-analytics-link-context="home_hero"]');
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

test("Primary navigation preserves editorial and professional path context", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const mobileMenu = page.locator("details.mobile-nav");
  const navigationName = await mobileMenu.isVisible() ? "Mobile navigation" : "Primary navigation";
  const navigation = page.getByRole("navigation", { name: navigationName });

  async function clickWithoutNavigation(label) {
    if (await mobileMenu.isVisible() && !(await mobileMenu.getAttribute("open"))) {
      await mobileMenu.locator("summary").click();
    }
    const link = navigation.getByRole("link", { name: label, exact: true });
    await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
    await link.click();
    return page.evaluate(() => window.__analyticsEvents.at(-1));
  }

  await expect(clickWithoutNavigation("Thinking")).resolves.toMatchObject({
    name: "collection_open",
    parameters: { collection: "thinking", page_type: "home" }
  });
  await expect(clickWithoutNavigation("Explore")).resolves.toMatchObject({
    name: "collection_open",
    parameters: { collection: "explore", page_type: "home" }
  });
  await expect(clickWithoutNavigation("Experience")).resolves.toMatchObject({
    name: "experience_open",
    parameters: { page_type: "home" }
  });
  await expect(clickWithoutNavigation("Influences")).resolves.toMatchObject({
    name: "collection_open",
    parameters: { collection: "influences", page_type: "home" }
  });

  const expectedContext = navigationName === "Mobile navigation" ? "mobile_navigation" : "primary_navigation";
  const events = await page.evaluate(() => window.__analyticsEvents.slice(-4));
  expect(events.every((event) => event.parameters.link_context === expectedContext)).toBe(true);
});

test("Contact section intent is distinct from opening a channel", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const mobileMenu = page.locator("details.mobile-nav");
  if (await mobileMenu.isVisible()) await mobileMenu.locator("summary").click();

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

test("Work discovery and meaningful section views expose their context", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/");

  const workLink = page.locator('[data-analytics-event="work_open"][data-analytics-link-context="home_selected_work"]');
  await workLink.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await workLink.click();

  expect(await page.evaluate(() => window.__analyticsEvents.at(-1))).toMatchObject({
    name: "work_open",
    parameters: {
      link_context: "home_selected_work",
      page_type: "home"
    }
  });

  await page.goto("/work/");
  await page.locator('[data-work-section="review"]').scrollIntoViewIfNeeded();
  await expect.poll(async () => page.evaluate(() =>
    window.__analyticsEvents.some((event) =>
      event.name === "work_section_view" && event.parameters.work_section === "review"
    )
  )).toBe(true);

  const experienceLink = page.locator('[data-analytics-event="experience_open"][data-analytics-link-context="work_experience"]');
  await experienceLink.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await experienceLink.click();
  expect(await page.evaluate(() => window.__analyticsEvents.at(-1))).toMatchObject({
    name: "experience_open",
    parameters: {
      link_context: "work_experience",
      page_type: "work"
    }
  });
});

test("Article signature actions expose distinct professional intent", async ({ page }) => {
  await captureAnalytics(page);
  await page.goto("/thinking/waiting-as-product-decision/");

  const signature = page.locator(".article-signature");
  const actions = [
    {
      link: signature.getByRole("link", { name: /Follow on LinkedIn/ }),
      event: "social_profile_open",
      parameters: { platform: "linkedin", link_context: "article_signature" }
    },
    {
      link: signature.getByRole("link", { name: /How I can help/ }),
      event: "work_open",
      parameters: { link_context: "article_signature" }
    },
    {
      link: signature.getByRole("link", { name: /Contact/ }),
      event: "contact_section_open",
      parameters: { link_context: "article_signature" }
    }
  ];

  for (const action of actions) {
    await action.link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
    await action.link.click();
    expect(await page.evaluate(() => window.__analyticsEvents.at(-1))).toMatchObject({
      name: action.event,
      parameters: {
        ...action.parameters,
        page_type: "note"
      }
    });
  }
});
