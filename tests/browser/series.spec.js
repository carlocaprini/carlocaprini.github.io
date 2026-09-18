import { expect, test } from "./support/site-test.js";

const seriesRoutes = [
  "/thinking/i-stopped-trying-to-build-jarvis/",
  "/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/",
  "/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/",
  "/thinking/why-i-started-building-friday/"
];

const allAiSeriesRoutes = [
  ...seriesRoutes,
  "/thinking/friday-connects-the-services-without-owning-their-work/",
  "/thinking/i-need-my-ai-dashboard-to-leave-things-out/"
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

const productionOrigin = "https://carlocaprini.github.io";
const productSeriesImage = `${productionOrigin}/assets/og-product-judgment-series-v1.png`;
const productSeriesImageAlt = "Product Judgment in Practice by Carlo Caprini, a series about information, trade-offs, timing, commitment and alignment in product decisions.";
const aiSeriesImage = `${productionOrigin}/assets/og-ai-operating-system-series-v1.png`;
const aiSeriesImageAlt = "Building My Own AI Operating System by Carlo Caprini, illustrated as colorful connected services converging into one system.";

async function expectSocialImage(page, image, alt) {
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", alt);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", alt);
}

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

test("series navigation exposes only valid directions at sequence boundaries", async ({ page }) => {
  for (const routes of [productSeriesRoutes, allAiSeriesRoutes]) {
    await page.goto(routes[0]);
    await expect(page.getByRole("link", { name: /Previous episode/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Next episode/ })).toHaveAttribute("href", routes[1]);

    await page.goto(routes.at(-1));
    await expect(page.getByRole("link", { name: /Previous episode/ })).toHaveAttribute("href", routes.at(-2));
    await expect(page.getByRole("link", { name: /Next episode/ })).toHaveCount(0);
  }
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
  await expect(page.getByRole("link", { name: "Back to Explore" })).toHaveAttribute("href", "/explore/#series");
});

test("Product Judgment landing page and episodes inherit the canonical social image", async ({ page }) => {
  for (const route of ["/series/product-judgment-in-practice/", ...productSeriesRoutes]) {
    await page.goto(route);
    await expectSocialImage(page, productSeriesImage, productSeriesImageAlt);
  }

  const structuredData = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.map((script) => JSON.parse(script.textContent))
  );
  expect(structuredData.find((entry) => entry["@type"] === "BlogPosting").image).toBe(productSeriesImage);
});

test("AI series landing page and episodes retain their canonical social image", async ({ page }) => {
  for (const route of ["/series/building-my-ai-operating-system/", allAiSeriesRoutes[0]]) {
    await page.goto(route);
    await expectSocialImage(page, aiSeriesImage, aiSeriesImageAlt);
  }
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
  for (const [route, expectedName, expectedRoutes, expectedImage] of [
    ["/series/product-judgment-in-practice/", "Product Judgment in Practice", productSeriesRoutes, productSeriesImage],
    ["/series/building-my-ai-operating-system/", "Building My Own AI Operating System", allAiSeriesRoutes, aiSeriesImage]
  ]) {
    await page.goto(route);
    const data = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent))
    );
    const series = data.find((entry) => entry["@type"] === "CreativeWorkSeries");
    const breadcrumbs = data.find((entry) => entry["@type"] === "BreadcrumbList");

    expect(series.name).toBe(expectedName);
    expect(series.image).toBe(expectedImage);
    expect(series.numberOfItems).toBe(expectedRoutes.length);
    expect(series.hasPart).toHaveLength(expectedRoutes.length);
    expect(series.hasPart.map((episode) => episode.position)).toEqual(
      Array.from({ length: expectedRoutes.length }, (_, index) => index + 1)
    );
    expect(series.hasPart.map((episode) => new URL(episode.url).pathname)).toEqual(expectedRoutes);
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

test("AI episodes retain the System Map and suppress Related Reading", async ({ page }) => {
  await page.goto(allAiSeriesRoutes[4]);

  await expect(page.locator("aside.article-system-map")).toHaveCount(1);
  await expect(page.locator("details.article-system-map-mobile")).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: "Related reading" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Related notes" })).toHaveCount(0);
});

test("Series sequence remains static when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/series/product-judgment-in-practice/");

  const animationNames = await page.locator(".series-overview-items").evaluate((element) =>
    Array.from(element.children, (item) => getComputedStyle(item).animationName)
  );

  expect(animationNames).toEqual(["none", "none", "none", "none", "none"]);
});
