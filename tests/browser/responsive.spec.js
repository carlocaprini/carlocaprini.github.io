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

test("Work keeps its recognition and evidence layers readable across breakpoints", async ({ page }, testInfo) => {
  await page.goto("/work/");

  const columns = await page.locator(".work-situation-list").evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
  );

  expect(columns).toBe(testInfo.project.name === "desktop-chromium" ? 2 : 1);
  await expect(page.locator(".work-outcome")).toBeVisible();
  await expect(page.locator(".work-contact-panel .button-primary")).toBeVisible();

  if (testInfo.project.name !== "desktop-chromium") {
    const viewportWidth = page.viewportSize().width;
    const surfaces = page.locator(".work-engagement, .work-boundary-note, .work-contact-panel");
    const boxes = await surfaces.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right };
    }));

    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(16);
      expect(box.right).toBeLessThanOrEqual(viewportWidth - 16);
    }
  }
});

test("article signature preserves identity and actions across breakpoints", async ({ page }, testInfo) => {
  await page.goto("/thinking/waiting-as-product-decision/");

  const signature = page.locator(".article-signature");
  const description = signature.locator(".article-signature-description");
  const followNote = signature.locator(".article-signature-follow > p");

  await expect(signature).toBeVisible();
  await expect(signature.locator(".article-signature-portrait")).toBeVisible();
  await expect(signature.getByRole("link", { name: /Follow on LinkedIn/ })).toBeVisible();
  await expect(signature.getByRole("link", { name: /How I can help/ })).toBeVisible();
  await expect(signature.getByRole("link", { name: /Contact/ })).toBeVisible();

  if (testInfo.project.name === "mobile-chromium") {
    await expect(description).toBeHidden();
    await expect(followNote).toBeHidden();
  } else {
    await expect(description).toBeVisible();
    await expect(followNote).toBeVisible();
  }

  const bounds = await signature.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(16);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth - 16);
  expect(bounds.scrollWidth).toBe(bounds.viewportWidth);
});
