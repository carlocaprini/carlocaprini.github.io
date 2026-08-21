import { expect, test as base } from "@playwright/test";

const runtimeErrors = new WeakMap();

base.beforeEach(async ({ page }) => {
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

base.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

export const test = base;
export { expect };

export async function captureAnalytics(page) {
  await page.addInitScript(() => {
    window.__analyticsEvents = [];
    window.addEventListener("site:analytics", (event) => {
      window.__analyticsEvents.push(event.detail);
    });
  });
}
