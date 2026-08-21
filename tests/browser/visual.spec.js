import { expect, test } from "@playwright/test";

const surfaces = [
  { name: "home-desktop", route: "/", viewport: { width: 1440, height: 900 } },
  { name: "home-mobile", route: "/", viewport: { width: 390, height: 844 } },
  { name: "thinking-index", route: "/thinking/", viewport: { width: 1440, height: 900 } },
  { name: "explore", route: "/explore/", viewport: { width: 1440, height: 900 } },
  { name: "thinking-article", route: "/thinking/waiting-as-product-decision/", viewport: { width: 1440, height: 900 } },
  { name: "series-article", route: "/thinking/friday-connects-the-services-without-owning-their-work/", viewport: { width: 1440, height: 900 } },
  { name: "experience", route: "/experience/", viewport: { width: 1440, height: 900 } }
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("site_analytics_consent", JSON.stringify({
      value: "denied",
      updatedAt: Date.now()
    }));
  });
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css", body: "" })
  );
});

for (const surface of surfaces) {
  test(`${surface.name} matches its visual baseline`, async ({ page }) => {
    await page.setViewportSize(surface.viewport);
    await page.goto(surface.route, { waitUntil: "networkidle" });
    await expect(page.locator("main#top")).toBeVisible();
    await expect(page).toHaveScreenshot(`${surface.name}.webp`, { fullPage: false, timeout: 20_000 });
  });
}

test("consent panel matches its visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cookie settings" }).click();
  await expect(page.getByRole("complementary", { name: "Help me understand how the site is used" }))
    .toBeVisible();
  await expect(page).toHaveScreenshot("consent-panel.webp", { fullPage: false, timeout: 20_000 });
});
