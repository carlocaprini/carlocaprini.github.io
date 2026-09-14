import { expect, test } from "./support/site-test.js";

const seriesRoutes = [
  "/thinking/i-stopped-trying-to-build-jarvis/",
  "/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/",
  "/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/",
  "/thinking/why-i-started-building-friday/"
];

const productSeriesRoutes = [
  "/thinking/the-transition-to-product-management-starts-before-the-title-changes/",
  "/thinking/most-product-disagreements-come-from-missing-information/",
  "/thinking/product-decisions-are-mostly-trade-offs/",
  "/thinking/the-urgency-of-customer-requests/",
  "/thinking/waiting-as-product-decision/",
  "/thinking/temporary-solutions-become-permanent/",
  "/thinking/managing-disagreements/"
];

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

test("Product Judgment presents the decision loop and seven ordered episodes", async ({ page }) => {
  await page.goto("/series/product-judgment-in-practice/");

  await expect(page.getByRole("heading", { level: 1, name: "Product Judgment in Practice" })).toBeVisible();
  await expect(page.getByText("How product decisions get made when information is incomplete and every option has a cost.", { exact: true })).toBeVisible();
  await expect(page.locator(".series-overview-item h3")).toHaveText([
    "Information",
    "Trade-offs",
    "Timing",
    "Commitment",
    "Alignment"
  ]);
  await expect(page.locator(".series-page-episodes > li > a")).toHaveCount(7);
  expect(await page.locator(".series-page-episodes > li > a").evaluateAll(
    (links) => links.map((link) => link.getAttribute("href"))
  )).toEqual(productSeriesRoutes);
  await expect(page.getByText("A few views of the system.", { exact: true })).toHaveCount(0);
  await expect(page.locator(".series-visuals-section")).toHaveCount(0);
});

test("Product episodes keep reading context without generic notes or a system map", async ({ page }) => {
  await page.goto(productSeriesRoutes[1]);

  await expect(page.getByText("Product Judgment in Practice", { exact: true })).toBeVisible();
  await expect(page.getByText("Episode 02", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Series context" })).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: "Services in this series" })).toHaveCount(0);
  await expect(page.locator("details.article-system-map-mobile")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Related notes" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Related reading" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Previous episode/ })).toHaveAttribute("href", productSeriesRoutes[0]);
  await expect(page.getByRole("link", { name: /Next episode/ })).toHaveAttribute("href", productSeriesRoutes[2]);
});

test("Series structured data uses ordered episodes and Explore breadcrumbs", async ({ page }) => {
  for (const [route, expectedName, expectedCount] of [
    ["/series/product-judgment-in-practice/", "Product Judgment in Practice", 7],
    ["/series/building-my-ai-operating-system/", "Building My Own AI Operating System", 6]
  ]) {
    await page.goto(route);
    const data = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent))
    );
    const series = data.find((entry) => entry["@type"] === "CreativeWorkSeries");
    const breadcrumbs = data.find((entry) => entry["@type"] === "BreadcrumbList");

    expect(series.name).toBe(expectedName);
    expect(series.hasPart).toHaveLength(expectedCount);
    expect(series.hasPart.map((episode) => episode.position)).toEqual(
      Array.from({ length: expectedCount }, (_, index) => index + 1)
    );
    expect(breadcrumbs.itemListElement.map((item) => item.name)).toEqual([
      "Home",
      "Explore",
      expectedName
    ]);
  }
});

test("series visuals expose episode progress and service identity", async ({ page }) => {
  await page.goto("/series/building-my-ai-operating-system/");

  await expect(page.locator(".series-visual-episode")).toHaveText([
    "Episode 02 / 06",
    "Episode 03 / 06",
    "Episode 04 / 06",
    "Episode 05 / 06",
    "Episode 06 / 06"
  ]);
  await expect(page.locator(".series-visual-service")).toHaveText([
    "August",
    "March",
    "Friday",
    "Friday",
    "Friday"
  ]);
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
