import { expect, test } from "@playwright/test";

const legacyOrigin = "http://127.0.0.1:4173";
const canonicalOrigin = "https://carlocaprini.com";
const interceptedDocument = "<title>Intercepted canonical target</title>";

async function interceptCanonical(page) {
  await page.route(`${canonicalOrigin}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: interceptedDocument })
  );
}

test("real known route remains available with a path-only fallback when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const legacyUrl = `${legacyOrigin}/thinking/an-api-is-not-an-agent-interface/?ref=legacy#section`;
    const response = await page.goto(legacyUrl);

    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(legacyUrl);
    await expect(page.getByRole("heading", { name: "This page has moved" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to this page on carlocaprini.com" })).toHaveAttribute(
      "href", "https://carlocaprini.com/thinking/an-api-is-not-an-agent-interface/"
    );
  } finally {
    await context.close();
  }
});

test("scripted known-route redirects preserve query strings and fragments", async ({ page }) => {
  await interceptCanonical(page);
  const cases = [
    ["/work/", `${canonicalOrigin}/work/`],
    ["/work/?utm_source=legacy", `${canonicalOrigin}/work/?utm_source=legacy`],
    ["/work/#contact", `${canonicalOrigin}/work/#contact`],
    ["/work/?utm_source=legacy#contact", `${canonicalOrigin}/work/?utm_source=legacy#contact`],
    ["/#contact", `${canonicalOrigin}/#contact`],
    ["/work/?redirect=https%3A%2F%2Fevil.example#contact", `${canonicalOrigin}/work/?redirect=https%3A%2F%2Fevil.example#contact`]
  ];

  for (const [input, expected] of cases) {
    await page.goto(`${legacyOrigin}${input}`);
    await expect.poll(() => page.url()).toBe(expected);
  }
});

test("scripted unknown-route redirect keeps the fixed origin and complete URL state", async ({ page }) => {
  const input = "/a-route-that-never-existed/?ref=test#section";
  const initial = await page.request.get(`${legacyOrigin}${input}`);
  expect(initial.status()).toBe(404);

  await interceptCanonical(page);
  await page.goto(`${legacyOrigin}${input}`);
  await expect.poll(() => page.url()).toBe(`${canonicalOrigin}${input}`);
});

test("unknown route stays 404 with a canonical-homepage emergency link when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const legacyUrl = `${legacyOrigin}/a-route-that-never-existed/?ref=test#section`;
    const response = await page.goto(legacyUrl);

    expect(response.status()).toBe(404);
    await expect(page).toHaveURL(legacyUrl);
    await expect(page.getByRole("heading", { name: "This page may have moved" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the carlocaprini.com homepage" })).toHaveAttribute(
      "href", `${canonicalOrigin}/`
    );
  } finally {
    await context.close();
  }
});
