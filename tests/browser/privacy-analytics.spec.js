import { expect, test } from "@playwright/test";

const endpoint = "http://127.0.0.1:8787/v1/measure";
const productionEndpoint = "https://collector.example.test/v1/measure";

async function enableLocalAggregateMeasurement(page, requests) {
  await page.route(endpoint, async (route) => {
    requests.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 204 });
  });

  await page.evaluate(async (collectorEndpoint) => {
    document.body.dataset.aggregateAnalyticsEnabled = "true";
    document.body.dataset.aggregateAnalyticsLocal = "true";
    document.body.dataset.aggregateAnalyticsEndpoint = collectorEndpoint;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/assets/js/aggregate-analytics.js?privacy-invariant-test=1";
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }, endpoint);
}

test("consent choices do not gate or duplicate aggregate measurement", async ({ page }) => {
  const requests = [];
  await page.goto("/thinking/i-stopped-trying-to-build-jarvis/");
  await enableLocalAggregateMeasurement(page, requests);

  await expect.poll(() => requests.filter((event) => event.event_name === "page_view").length).toBe(1);
  await expect.poll(() => requests.filter((event) => event.event_name === "content_view").length).toBe(1);

  const consent = page.getByRole("complementary", { name: "Help me understand how the site is used" });
  await consent.getByRole("button", { name: "No thanks" }).click();

  await expect.poll(() => requests.filter(
    (event) => event.event_name === "consent_choice" && event.target_id === "denied"
  ).length).toBe(1);
  expect(requests.filter((event) => event.event_name === "content_view")).toHaveLength(1);
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Cookie settings" }).click();
  await consent.getByRole("button", { name: "Accept analytics" }).click();

  await expect.poll(() => requests.filter(
    (event) => event.event_name === "consent_choice" && event.target_id === "granted"
  ).length).toBe(1);
  expect(requests.filter((event) => event.event_name === "page_view")).toHaveLength(1);
  expect(requests.filter((event) => event.event_name === "content_view")).toHaveLength(1);

  // Production-only GA must still stay fail-closed on the local test host.
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
});

test("aggregate measurement stays disabled when a production endpoint is rendered on a non-production host", async ({ page }) => {
  const requests = [];
  await page.route(productionEndpoint, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 204 });
  });

  await page.goto("/");
  await page.evaluate(async (collectorEndpoint) => {
    document.body.dataset.aggregateAnalyticsEnabled = "true";
    document.body.dataset.aggregateAnalyticsEndpoint = collectorEndpoint;
    document.body.dataset.analyticsHostname = "carlocaprini.github.io";

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/assets/js/aggregate-analytics.js?production-host-test=1";
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }, productionEndpoint);

  expect(await page.evaluate(() => window.siteAggregateAnalytics.enabled)).toBe(false);
  expect(requests).toHaveLength(0);
});

test("revoking consent removes accessible GA cookies while aggregate measurement remains active", async ({ page, context }) => {
  const requests = [];
  await page.goto("/");
  await enableLocalAggregateMeasurement(page, requests);

  await context.addCookies([
    { name: "_ga", value: "GA1.1.test", url: "http://127.0.0.1:4000/" },
    { name: "_ga_TEST", value: "session", url: "http://127.0.0.1:4000/" }
  ]);

  const consent = page.getByRole("complementary", { name: "Help me understand how the site is used" });
  await consent.getByRole("button", { name: "Accept analytics" }).click();
  await page.getByRole("button", { name: "Cookie settings" }).click();
  await consent.getByRole("button", { name: "No thanks" }).click();

  await expect.poll(async () => (await context.cookies()).filter(
    (cookie) => cookie.name === "_ga" || cookie.name.startsWith("_ga_")
  ).length).toBe(0);

  await expect.poll(() => requests.filter(
    (event) => event.event_name === "consent_choice" && event.target_id === "denied"
  ).length).toBe(1);
  expect(requests.filter((event) => event.event_name === "page_view")).toHaveLength(1);
});
