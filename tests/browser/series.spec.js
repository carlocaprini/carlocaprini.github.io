import { expect, test } from "./support/site-test.js";

const seriesRoutes = [
  "/thinking/i-stopped-trying-to-build-jarvis/",
  "/thinking/i-built-august-because-copy-and-paste-was-not-collaboration/",
  "/thinking/i-built-march-to-plan-with-ai-without-becoming-a-content-machine/",
  "/thinking/why-i-started-building-friday/"
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
