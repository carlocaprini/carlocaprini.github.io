import { expect, test } from "./support/site-test.js";

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
