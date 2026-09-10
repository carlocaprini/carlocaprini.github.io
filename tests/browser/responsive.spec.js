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

test("article topic motifs protect long titles across responsive compositions", async ({ page }) => {
  const viewports = [
    { width: 834, height: 1112 },
    { width: 700, height: 900 },
    { width: 641, height: 900 },
    { width: 640, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 720 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/thinking/the-transition-to-product-management-starts-before-the-title-changes/");
    for (const variant of ["balanced", "spatial"]) {
      await page.locator(".article-topic-hero").evaluate((hero, selectedVariant) => {
        const motif = hero.querySelector(".article-topic-motif");
        hero.classList.remove("article-topic-hero--balanced", "article-topic-hero--spatial");
        motif.classList.remove("article-topic-motif--balanced", "article-topic-motif--spatial");
        hero.classList.add(`article-topic-hero--${selectedVariant}`);
        motif.classList.add(`article-topic-motif--${selectedVariant}`);
        hero.dataset.motifVariant = selectedVariant;
      }, variant);

      const hero = page.locator(".article-topic-hero");
      const title = hero.locator("h1");
      await expect(title).toBeVisible();
      await expect(hero.locator(".article-topic-motif")).toBeVisible();
      const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        titleWidth: document.querySelector(".article-topic-hero h1").getBoundingClientRect().width,
        heroTop: document.querySelector(".article-topic-hero").getBoundingClientRect().top,
        headerBottom: document.querySelector(".site-header").getBoundingClientRect().bottom
      }));
      expect(metrics.documentWidth).toBe(metrics.viewportWidth);
      expect(metrics.titleWidth).toBeGreaterThan(viewport.width * 0.8);
      expect(Math.abs(metrics.heroTop - metrics.headerBottom)).toBeLessThanOrEqual(1);
    }
  }
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

test("Home Contact preserves CTA-first identity hierarchy across breakpoints", async ({ page }, testInfo) => {
  await page.goto("/");

  const contact = page.locator("#contact");
  const grid = contact.locator(".contact-grid");
  const linkedin = contact.locator(".contact-linkedin");
  const identity = contact.locator(".contact-identity");
  const portrait = contact.locator(".contact-portrait");

  await expect(linkedin).toBeVisible();
  await expect(identity).toBeVisible();
  await expect(portrait).toBeVisible();

  const state = await contact.evaluate((section) => {
    const gridElement = section.querySelector(".contact-grid");
    const linkElement = section.querySelector(".contact-linkedin");
    const identityElement = section.querySelector(".contact-identity");
    const portraitElement = section.querySelector(".contact-portrait");
    const identityText = identityElement.querySelector("p");
    const identityBox = identityElement.getBoundingClientRect();
    const portraitBox = portraitElement.getBoundingClientRect();

    return {
      columns: getComputedStyle(gridElement).gridTemplateColumns.split(" ").length,
      linkTop: linkElement.getBoundingClientRect().top,
      identityTop: identityBox.top,
      identityRight: identityBox.right,
      linkFontSize: Number.parseFloat(getComputedStyle(linkElement).fontSize),
      identityFontSize: Number.parseFloat(getComputedStyle(identityText).fontSize),
      portraitWidth: portraitBox.width,
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });

  expect(state.columns).toBe(testInfo.project.name === "desktop-chromium" ? 2 : 1);
  expect(state.linkTop).toBeLessThan(state.identityTop);
  expect(state.linkFontSize).toBeGreaterThan(state.identityFontSize);
  expect(state.portraitWidth).toBeLessThanOrEqual(testInfo.project.name === "mobile-chromium" ? 80 : 120);
  expect(state.identityRight).toBeLessThanOrEqual(state.viewportWidth - 16);
  expect(state.scrollWidth).toBe(state.viewportWidth);
});

test("Work keeps its recognition and evidence layers readable across breakpoints", async ({ page }, testInfo) => {
  await page.goto("/work/");

  const columns = await page.locator(".work-situation-list").evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
  );
  const principleFlow = await page.locator(".step-flow").evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));

  expect(columns).toBe(testInfo.project.name === "desktop-chromium" ? 2 : 1);
  expect(principleFlow.columns).toBe(testInfo.project.name === "desktop-chromium" ? 3 : 1);
  expect(principleFlow.left).toBeGreaterThanOrEqual(0);
  expect(principleFlow.right).toBeLessThanOrEqual(principleFlow.viewportWidth);
  expect(principleFlow.scrollWidth).toBe(principleFlow.viewportWidth);
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
