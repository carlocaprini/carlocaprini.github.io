import { expect, test as base } from "@playwright/test";

const runtimeErrors = new WeakMap();
const expectedRuntimeErrors = new WeakMap();

base.beforeEach(async ({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  expectedRuntimeErrors.set(page, []);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

});

base.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual(expectedRuntimeErrors.get(page));
});

export const test = base;
export { expect };

export function expectRuntimeErrors(page, errors) {
  expectedRuntimeErrors.set(page, errors);
}

export async function captureAnalytics(page) {
  await page.addInitScript(() => {
    window.__analyticsEvents = [];
    window.addEventListener("site:analytics", (event) => {
      window.__analyticsEvents.push(event.detail);
    });
  });
}
