import { expect, test } from "@playwright/test";

test("known route has an accessible manual fallback when scripting is unavailable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await context.request.get("http://127.0.0.1:4173/thinking/an-api-is-not-an-agent-interface/");
  expect(response.status()).toBe(200);
  const html = (await response.text()).replace(/<meta http-equiv="refresh"[^>]+>/, "");
  await page.setContent(html);
  await expect(page.getByRole("heading", { name: "This page has moved" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to carlocaprini.com" })).toHaveAttribute(
    "href", "https://carlocaprini.com/thinking/an-api-is-not-an-agent-interface/"
  );
  await context.close();
});

test("scripted redirect preserves query and fragment without making a live request", async ({ page }) => {
  let destination;
  await page.route("https://carlocaprini.com/**", async (route) => {
    destination = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Intercepted canonical target</title>" });
  });
  await page.goto("/work/?utm_source=legacy#contact");
  await expect.poll(() => destination).toBe("https://carlocaprini.com/work/?utm_source=legacy");
  await expect.poll(() => page.url()).toBe("https://carlocaprini.com/work/?utm_source=legacy#contact");
});

test("unknown routes return 404 and expose the same-path manual fallback", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto("/a-route-that-never-existed/?ref=test#section");
  expect(response.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page may have moved" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to carlocaprini.com" })).toHaveAttribute("href", "https://carlocaprini.com/");
  await context.close();
});
