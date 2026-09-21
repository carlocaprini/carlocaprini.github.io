import { expect, test } from "./support/site-test.js";

test("Explore exposes Questions, both Series and stable topic hashes", async ({ page }) => {
  await page.goto("/explore/#ai-and-automation");

  await expect(page.getByRole("heading", { name: "Three paths through the ideas." })).toBeVisible();
  await expect(page.getByRole("link", { name: /How do teams make better decisions/ })).toBeVisible();
  await expect(page.locator(".question-path-entry")).toHaveText([
    "Start here · Most product disagreements come from missing information",
    "Start here · Shared context is not shared understanding",
    "Start here · AI accelerates contribution, not mastery"
  ]);
  await expect(page.locator(".question-path-item a a")).toHaveCount(0);
  const series = page.locator("#series .series-discovery-item");
  await expect(series).toHaveCount(2);
  await expect(series.locator("h3")).toHaveText([
    "Product Judgment in Practice",
    "Building My Own AI Operating System"
  ]);
  await expect(series.locator(".series-discovery-meta > span")).toHaveText(["7 episodes", "6 episodes"]);
  await expect(series.first().locator("h3 a")).toHaveAttribute("data-analytics-link-context", "explore_series");
  await expect(series.first().locator("h3 a")).toHaveAttribute("data-analytics-series-id", "product-judgment-in-practice");
  const seriesIndexMarkers = await series.locator(".series-discovery-index").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element, "::before").content)
  );
  expect(seriesIndexMarkers).toEqual(["none", "none"]);
  await expect(page.locator('[data-explore-topic="ai-and-automation"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-explore-topic-panel="ai-and-automation"]')).toBeVisible();

  await page.goto("/explore/#series");
  await expect(page).toHaveURL(/\/explore\/#series$/);
  await expect(page.locator("#series")).toBeVisible();
});

test("Thinking separates guided, recent and complete discovery", async ({ page }) => {
  await page.goto("/thinking/");

  const startHere = page.locator(".thinking-start-here");
  await expect(startHere.getByText("Start here", { exact: true })).toBeVisible();
  await expect(startHere.getByRole("heading", { name: "Selected notes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Follow a question through the notes." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The latest notes." })).toBeVisible();
  await expect(page.locator("h2#all-notes")).toHaveText("All notes");
  await expect(page.locator(".thinking-recent-list > li")).toHaveCount(3);
  const series = page.locator(".thinking-series-stack .thinking-series-card");
  await expect(series).toHaveCount(2);
  await expect(series.locator(".thinking-series-card-content > strong")).toHaveText([
    "Product Judgment in Practice",
    "Building My Own AI Operating System"
  ]);
  await expect(series.first().locator(".thinking-series-card-label")).toHaveText("Featured series");
  await expect(series.locator(".thinking-series-card-label")).toHaveCount(1);
  const seriesCardGeometry = await series.locator(".thinking-series-card-link").evaluateAll((links) =>
    links.map((link) => {
      const style = getComputedStyle(link);
      return {
        minHeight: style.minHeight,
        padding: style.padding,
        borderRadius: style.borderRadius
      };
    })
  );
  expect(new Set(seriesCardGeometry.map((style) => JSON.stringify(style))).size).toBe(1);
  await expect(series.first().locator(".thinking-series-card-link")).toHaveAttribute("data-analytics-link-context", "thinking_series");
  await expect(page.locator(".thinking-series-stack-header, .thinking-series-browse")).toHaveCount(0);
});

test("ruled collections stop before the next section divider", async ({ page }) => {
  for (const route of ["/", "/thinking/", "/explore/"]) {
    await page.goto(route);
    const finalQuestionBorder = await page.locator(".question-path-item").last().evaluate(
      (element) => getComputedStyle(element).borderBottomWidth
    );
    expect(finalQuestionBorder).toBe("0px");
  }

  await page.goto("/series/building-my-ai-operating-system/");
  const finalEpisodeBorder = await page.locator(".series-page-episodes > li").last().evaluate(
    (element) => getComputedStyle(element).borderBottomWidth
  );
  expect(finalEpisodeBorder).toBe("0px");
});

test("Recent Thinking uses internal separators and padded content", async ({ page }, testInfo) => {
  await page.goto("/thinking/");

  const listBorder = await page.locator(".thinking-recent-list").evaluate(
    (element) => getComputedStyle(element).borderTopWidth
  );
  const itemStyles = await page.locator(".thinking-recent-list > li").evaluateAll((items) =>
    items.map((element) => {
      const style = getComputedStyle(element);
      return {
        borderBottom: style.borderBottomWidth,
        borderRight: style.borderRightWidth,
        paddingLeft: Number.parseFloat(style.paddingLeft)
      };
    })
  );

  expect(listBorder).toBe("0px");
  expect(itemStyles.every((item) => item.paddingLeft > 0)).toBe(true);

  if (testInfo.project.name === "desktop-chromium") {
    expect(itemStyles.map((item) => item.borderRight)).toEqual(["1px", "1px", "0px"]);
    expect(itemStyles.every((item) => item.borderBottom === "0px")).toBe(true);
    return;
  }

  expect(itemStyles.every((item) => item.borderRight === "0px")).toBe(true);
  expect(itemStyles.map((item) => item.borderBottom)).toEqual(["1px", "1px", "0px"]);
});

test("Home follows the discovery-first content order", async ({ page }) => {
  await page.goto("/");

  const startHere = page.locator(".home-start-here");
  await expect(startHere.getByText("Start here", { exact: true })).toBeVisible();
  await expect(startHere.getByRole("heading", { name: "Selected notes" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Problems I occasionally help teams work through." })).toBeVisible();
  await expect(page.getByRole("link", { name: "How I can help", exact: true })).toHaveCount(2);
  await expect(page.locator(".home-entry-grid").getByRole("link", { name: /Explore/ })).toHaveAttribute("href", "/explore/");
  const featuredSeries = page.locator(".home-series-preview");
  await expect(featuredSeries).toHaveCount(1);
  await expect(featuredSeries.getByRole("heading", { name: "Product Judgment in Practice" })).toBeVisible();
  await expect(featuredSeries.getByText("7 episodes", { exact: true })).toBeVisible();
  await expect(featuredSeries.getByRole("link", { name: /Read the series/ })).toHaveAttribute("data-analytics-link-context", "home_featured_series");
  await expect(page.getByRole("heading", { name: "Building My Own AI Operating System" })).toHaveCount(0);
});

test("Home Contact keeps LinkedIn primary and adds restrained profile identity", async ({ page }) => {
  await page.goto("/");

  const contact = page.locator("#contact");
  await expect(contact.getByRole("heading", { name: "Continue the conversation" })).toBeVisible();
  for (const copy of [
    "If a note here connects with a product, platform or team problem you are working through, I am always interested in comparing perspectives.",
    "I’m also open to selected collaborations where product direction, platform evolution and AI adoption intersect.",
    "The easiest way to reach me is via LinkedIn.",
    "Based in Italy, working with teams globally."
  ]) {
    await expect(contact.getByText(copy, { exact: true })).toBeVisible();
  }

  await expect(contact.getByText("Product manager working across software, platforms and AI.", { exact: true })).toBeVisible();
  await expect(contact.getByText("I work at the intersection of product, systems and teams.", { exact: true })).toHaveCount(0);
  await expect(contact.locator(".contact-portrait")).toHaveAttribute("src", "/assets/carlo-caprini-profile.png");
  await expect(contact.locator(".contact-portrait")).toHaveAttribute("alt", "");
  await expect(contact.getByRole("link", { name: /carlocaprini/ })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/carlocaprini/"
  );
});

test("Work explains recognizable problems and exactly two engagement models", async ({ page }) => {
  await page.goto("/work/");

  await expect(page.getByRole("heading", { name: "When the problem crosses boundaries." })).toBeVisible();
  await expect(page.locator(".work-situation-list > li")).toHaveCount(6);
  await expect(page.locator(".work-engagement")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Understand the system before changing it." })).toBeVisible();
  await expect(page.getByText("Depending on the problem, I may look directly at repositories, tests, CI/CD configuration and technical documentation, not just interviews or presentations.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Work through the changes together." })).toBeVisible();
  await expect(page.getByText("Illustrative example", { exact: true })).toHaveCount(0);
  await expect(page.locator(".work-engagement--advisory").getByText("Outcome", { exact: true })).toHaveCount(0);
  const principleFlow = page.locator("ol.step-flow");
  await expect(principleFlow).toHaveCount(1);
  await expect(principleFlow.locator(":scope > li")).toHaveCount(3);
  await expect(principleFlow.locator(":scope > li h3")).toHaveText([
    "Understand the system before recommending changes",
    "Work from evidence, not only opinions",
    "Review the system, not the team"
  ]);
  await expect(page.getByRole("heading", { name: "Review the system, not the team" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Experience across Product & Engineering." })).toBeVisible();
  await expect(page.locator(".work-evidence-signals > li")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /See full experience/ })).toHaveAttribute("href", "/experience/");
  await expect(page.getByRole("link", { name: /Start a conversation/ })).toHaveAttribute("href", /^https:\/\//);
});

test("Experience leads with direct work and leaves credentials out of the public page", async ({ page }) => {
  await page.goto("/experience/");

  await expect(page.getByRole("heading", { name: "Problems I have worked on directly." })).toBeVisible();
  await expect(page.locator(".experience-evidence-card")).toHaveCount(4);
  await expect(page.getByText("Career context", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "How I can help", exact: true })).toHaveAttribute("href", "/work/");
  await expect(page.getByRole("heading", { name: "Credentials and certifications" })).toHaveCount(0);
  await expect(page.locator("#credentials")).toHaveCount(0);
});

test("question pages connect Thinking, Influences and Experience", async ({ page }) => {
  await page.goto("/explore/product-decisions/");

  await expect(page.locator(".question-synthesis > p")).toHaveCount(2);
  const entryPoint = page.locator(".question-entry-point");
  await expect(entryPoint.getByText("Start here", { exact: true })).toBeVisible();
  await expect(entryPoint.getByRole("heading", { name: "Most product disagreements come from missing information" })).toBeVisible();
  await expect(entryPoint.getByText("Better decisions begin by separating genuine disagreement from missing information, assumptions and different interpretations of the problem.", { exact: true })).toBeVisible();
  await expect(entryPoint).toHaveCSS("background-image", "none");
  await expect(entryPoint).toHaveCSS("border-radius", "0px");
  await expect(entryPoint.locator(".content-topic-list a")).toHaveCount(0);
  const entryLink = entryPoint.getByRole("link", { name: "Read this note: Most product disagreements come from missing information" });
  await expect(entryLink).toHaveClass(/section-link/);
  await expect(entryLink).toHaveAttribute("href", "/thinking/most-product-disagreements-come-from-missing-information/");
  await expect(entryLink).toHaveAttribute("data-analytics-link-context", "question_entry_point");
  await expect(page.locator('a[href="/thinking/most-product-disagreements-come-from-missing-information/"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Notes that develop the question." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ideas that sharpen the question." })).toBeVisible();
  await expect(page.getByRole("link", { name: /See the experience behind this question/ })).toHaveAttribute(
    "href",
    "/experience/#product-direction"
  );

  const noteTopics = page.locator(".question-note-group .content-topic-list").first();
  const noteTopic = noteTopics.locator(".content-topic-link").first();
  await expect(noteTopics).toHaveCSS("display", "flex");
  await expect(noteTopic).toHaveCSS("display", "flex");
  await expect(noteTopic).toHaveCSS("align-items", "center");
  await expect(noteTopic).toHaveCSS("border-radius", "999px");
  const restingStyle = await noteTopic.evaluate((element) => ({
    borderColor: getComputedStyle(element).borderColor,
    color: getComputedStyle(element).color
  }));
  await noteTopic.hover();
  const hoverStyle = await noteTopic.evaluate((element) => ({
    borderColor: getComputedStyle(element).borderColor,
    color: getComputedStyle(element).color
  }));
  expect(hoverStyle).toEqual(restingStyle);
});

test("every Question exposes its canonical entry point once", async ({ page }) => {
  const entryPoints = [
    ["product-decisions", "Most product disagreements come from missing information", "/thinking/most-product-disagreements-come-from-missing-information/"],
    ["shared-understanding", "Shared context is not shared understanding", "/thinking/shared-context-is-not-shared-understanding/"],
    ["ai-and-work", "AI accelerates contribution, not mastery", "/thinking/ai-accelerates-contribution-not-mastery/"]
  ];

  for (const [question, title, href] of entryPoints) {
    await page.goto(`/explore/${question}/`);
    const entryPoint = page.locator(".question-entry-point");
    await expect(entryPoint.getByRole("heading", { name: title })).toBeVisible();
    await expect(entryPoint.getByRole("link", { name: `Read this note: ${title}` })).toHaveAttribute("href", href);
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(1);
  }
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

test("primary topic order drives article identity without exposing Question topic navigation", async ({ page }) => {
  await page.goto("/thinking/shared-context-is-not-shared-understanding/");

  const hero = page.locator(".article-topic-hero");
  await expect(hero).toHaveAttribute("data-primary-topic", "teams-and-collaboration");
  await expect(hero.locator(".topic-motif--teams-and-collaboration")).toHaveCount(1);
  await expect(hero).toHaveAttribute("data-motif-variant", "spatial");
  await expect(hero.locator(".article-topic-motif")).toHaveAttribute("data-motif-family", "partial-convergence");
  await expect(hero.locator(".article-topic-motif")).toHaveAttribute("aria-hidden", "true");
  await expect(hero.locator(".article-topic-motif svg")).toHaveAttribute("focusable", "false");
  await expect(hero.locator(".content-topic-link").first()).toHaveClass(/content-topic-link--primary/);
  await expect(hero.locator(".content-topic-link").first()).toContainText("Teams and collaboration");

  await page.goto("/explore/");
  const sharedUnderstanding = page.locator(".question-path-item--shared-understanding");
  await expect(sharedUnderstanding.locator(".content-topic-list")).toHaveCount(0);

  await page.goto("/thinking/");
  await expect(page.locator(".question-path-list .content-topic-list")).toHaveCount(0);

  await page.goto("/");
  await expect(page.locator(".home-questions-section .content-topic-list")).toHaveCount(0);

  await page.goto("/explore/shared-understanding/");
  await expect(page.locator(".question-hero-topics")).toHaveCount(0);
});

test("article motifs use the primary topic's canonical color and geometry", async ({ page }) => {
  const examples = [
    ["/thinking/product-decisions-are-mostly-trade-offs/", "product-decisions", "branching", "rgb(251, 191, 36)", ".motif-node--terminal"],
    ["/thinking/adding-mcp-doesnt-make-a-product-agent-first/", "ai-and-automation", "bounded-loops", "rgb(34, 211, 238)", ".motif-node--authority"],
    ["/thinking/stop-asking-people-for-information-the-system-already-has/", "software-systems", "layered-interfaces", "rgb(129, 140, 248)", ".motif-plane"],
    ["/thinking/shared-context-is-not-shared-understanding/", "teams-and-collaboration", "partial-convergence", "rgb(52, 211, 153)", ".motif-node--large"]
  ];
  const variations = new Set();

  for (const [route, topic, family, color, structuralMarker] of examples) {
    await page.goto(route);
    const hero = page.locator(".article-topic-hero");
    const motif = hero.locator(".article-topic-motif");
    await expect(hero).toHaveAttribute("data-primary-topic", topic);
    await expect(motif).toHaveAttribute("data-motif-family", family);
    await expect(motif).toHaveAttribute("data-motif-variation", /^[0-3]$/);
    variations.add(await motif.getAttribute("data-motif-variation"));
    await expect(motif).toHaveCSS("color", color);
    await expect(motif.locator(structuralMarker).first()).toBeAttached();
  }

  expect(variations.size).toBeGreaterThanOrEqual(3);
});

test("article motifs are complete static decoration with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const reducedPage = await context.newPage();
  await reducedPage.goto("/thinking/product-decisions-are-mostly-trade-offs/");
  const motif = reducedPage.locator(".article-topic-motif");
  await expect(motif).toBeVisible();
  await expect(motif).toHaveCSS("animation-name", "none");
  await expect(motif.locator(".motif-path").first()).toBeVisible();
  await context.close();
});

test("Influence accents follow the audited first topic", async ({ page }) => {
  await page.goto("/influences/");

  const softwareInfluence = page.locator(".influence-item", {
    has: page.getByRole("link", { name: /AI Coding Is Not the Same as Software Engineering/ })
  });
  await expect(softwareInfluence).toHaveClass(/influence-item--software-systems/);
  await expect(softwareInfluence.locator(".content-topic-link").first()).toContainText("Software systems");
});

test("notes end with a consistent author signature and professional paths", async ({ page }) => {
  await page.goto("/thinking/waiting-as-product-decision/");

  const signature = page.locator(".article-signature");
  await expect(signature.getByText("Carlo Caprini", { exact: true })).toBeVisible();
  await expect(signature.getByText("Senior Product Manager", { exact: true })).toBeVisible();
  await expect(signature.locator(".article-signature-portrait")).toHaveAttribute(
    "src",
    "/assets/carlo-caprini-profile.png"
  );
  await expect(signature.locator(".article-signature-portrait")).toHaveAttribute("alt", "");
  await expect(signature.getByRole("link", { name: /Follow on LinkedIn/ })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/carlocaprini/"
  );
  await expect(signature.getByRole("link", { name: /Follow via RSS/ })).toHaveAttribute("href", "/feed.xml");
  await expect(signature.getByRole("link", { name: /How I can help/ })).toHaveAttribute("href", "/work/");
  await expect(signature.getByRole("link", { name: /Contact/ })).toHaveAttribute("href", "/#contact");
  await expect(signature.getByRole("link", { name: /Experience/ })).toHaveCount(0);
});

test("curated Influences return to a relevant Question", async ({ page }) => {
  await page.goto("/influences/");

  await expect(page.locator(".influence-question-link").first()).toBeVisible();
  await expect(page.locator(".influence-question-link").first().getByRole("link")).toHaveAttribute(
    "href",
    /\/explore\/(product-decisions|shared-understanding|ai-and-work)\/$/
  );
});
