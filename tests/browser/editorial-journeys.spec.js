import { expect, test } from "./support/site-test.js";

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
  await expect(page.locator(".home-entry-grid").getByRole("link", { name: /Explore/ })).toHaveAttribute("href", "/explore/");
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

  await expect(contact.getByText("Product leader with a software engineering background.", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Understand before changing." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Work through the changes together." })).toBeVisible();
  await expect(page.getByText("Illustrative example", { exact: true })).toHaveCount(0);
  await expect(page.locator(".work-engagement--advisory").getByText("Outcome", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Start a conversation/ })).toHaveAttribute("href", /^https:\/\//);
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

test("notes end with a consistent author signature and professional paths", async ({ page }) => {
  await page.goto("/thinking/waiting-as-product-decision/");

  const signature = page.locator(".article-signature");
  await expect(signature.getByText("Carlo Caprini", { exact: true })).toBeVisible();
  await expect(signature.getByText("Product Leadership & Strategy", { exact: true })).toBeVisible();
  await expect(signature.locator(".article-signature-portrait")).toHaveAttribute(
    "src",
    "/assets/carlo-caprini-profile.png"
  );
  await expect(signature.locator(".article-signature-portrait")).toHaveAttribute("alt", "");
  await expect(signature.getByRole("link", { name: /Follow on LinkedIn/ })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/carlocaprini/"
  );
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
