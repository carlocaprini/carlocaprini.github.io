import { expect, test } from "@playwright/test";

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

test("Home and primary navigation render", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  if (testInfo.project.name === "webkit-desktop") {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.locator("details.mobile-nav")).toBeHidden();
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeHidden();
    await page.locator("details.mobile-nav summary").click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  }
});

test("representative pages avoid horizontal overflow", async ({ page }) => {
  for (const route of ["/", "/explore/", "/thinking/waiting-as-product-decision/", "/series/building-my-ai-operating-system/"]) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});

test("normal and Series articles retain their navigation", async ({ page }) => {
  await page.goto("/thinking/waiting-as-product-decision/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Part of a bigger question" })).toBeVisible();

  await page.goto("/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/");
  await expect(page.getByRole("complementary", { name: "Series context" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Next episode/ })).toBeVisible();
});

test("Explore topics remain interactive", async ({ page }) => {
  await page.goto("/explore/");
  const filter = page.locator('[data-explore-topic="software-systems"]');
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-explore-topic-panel="software-systems"]')).toBeVisible();
});

test("consent can be denied and reopened without loading Analytics", async ({ page }) => {
  await page.goto("/");
  const consent = page.getByRole("complementary", { name: "Help me understand how the site is used" });
  await consent.getByRole("button", { name: "No thanks" }).click();
  await expect(consent).toBeHidden();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Cookie settings" }).click();
  await expect(consent).toBeVisible();
});

test("local previews remain analytics-safe", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.body.dataset.analyticsEnabled = "true";
    document.body.dataset.analyticsId = "G-TEST";
    document.body.dataset.analyticsHostname = "carlocaprini.github.io";
  });
  await page.getByRole("button", { name: "Accept analytics" }).click();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");
});

test("skip link accepts focus and keyboard activation", async ({ page }) => {
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#top$/);
});
