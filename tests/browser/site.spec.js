import { expect, test } from "@playwright/test";

const coreRoutes = [
  "/",
  "/thinking/",
  "/experience/",
  "/influences/",
  "/knowledge/",
  "/series/building-my-ai-operating-system/",
  "/thinking/i-stopped-trying-to-build-jarvis/",
  "/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/",
  "/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/",
  "/thinking/why-i-started-building-friday/"
];

const seriesRoutes = coreRoutes.slice(6);

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
});

for (const route of coreRoutes) {
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
