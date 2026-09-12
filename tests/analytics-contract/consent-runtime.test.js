import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const runtime = await readFile(new URL("../../assets/js/consent.js", import.meta.url), "utf8");

function element(attributes = {}) {
  return {
    hidden: true,
    querySelector: () => null,
    querySelectorAll: () => [],
    getAttribute(name) { return attributes[name] || null; }
  };
}

function analyticsConfiguration({ pageType, url }) {
  const calls = [];
  const body = element({
    "data-analytics-enabled": "true",
    "data-analytics-hostname": "site.test",
    "data-analytics-id": "G-TEST",
    "data-analytics-page-type": pageType
  });
  const panel = element();
  const location = new URL(url);
  const context = {
    CustomEvent: class {},
    Date,
    JSON,
    URL,
    document: {
      body,
      cookie: "",
      createElement: () => ({}),
      getElementById: () => panel,
      head: { appendChild() {} },
      querySelector: () => null
    },
    location,
    window: {
      dispatchEvent() {},
      gtag: (...args) => calls.push(args),
      localStorage: {
        getItem: () => JSON.stringify({ value: "granted", updatedAt: Date.now() }),
        removeItem() {},
        setItem() {}
      },
      location
    }
  };

  vm.runInNewContext(runtime, context);
  return calls.find(([command]) => command === "config")?.[2];
}

test("404 analytics keeps the missing pathname but removes query and fragment", () => {
  const configuration = analyticsConfiguration({
    pageType: "not_found",
    url: "https://site.test/missing/path/?email=private@example.test#secret"
  });

  assert.equal(configuration.page_location, "https://site.test/missing/path/");
  assert.doesNotMatch(JSON.stringify(configuration), /private|secret/);
});

test("ordinary pages retain GA4 native page-location and campaign handling", () => {
  const configuration = analyticsConfiguration({
    pageType: "thinking",
    url: "https://site.test/thinking/?utm_source=linkedin"
  });

  assert.equal(configuration.page_location, undefined);
});
