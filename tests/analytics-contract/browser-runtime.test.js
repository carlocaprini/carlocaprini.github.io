import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const generated = await readFile(new URL("../../assets/js/analytics-contract.generated.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../../assets/js/analytics.js", import.meta.url), "utf8");

function element(values = {}) {
  return {
    attributes: Object.entries(values).map(([name, value]) => ({ name, value })),
    getAttribute(name) { return values[name] || null; },
    setAttribute(name, value) { values[name] = value; }
  };
}

function setup(paths = []) {
  const links = paths.map((path) => Object.assign(element(), { href: new URL(path, "https://site.test").href }));
  const body = element({
    "data-analytics-content": "true", "data-analytics-enabled": "true",
    "data-analytics-id": "G-TEST", "data-analytics-hostname": "site.test",
    "data-analytics-page-type": "note", "data-analytics-page-id": "/thinking/current/"
  });
  const calls = [], events = [], listeners = {};
  const window = {
    location: new URL("https://site.test/thinking/current/"),
    gtag: (...args) => calls.push(args),
    dispatchEvent: (event) => events.push(event),
    addEventListener: (name, callback) => { listeners[name] = callback; }
  };
  const context = { window, URL, Set, CustomEvent: class { constructor(type, detail) { this.type = type; Object.assign(this, detail); } },
    document: { body, querySelectorAll: () => links, addEventListener() {} } };
  vm.runInNewContext(generated + runtime, context);
  return { window, calls, events, listeners, links };
}

test("GA4 and semantic bus receive only event-specific scalar parameters", () => {
  const { window, calls, events, listeners } = setup();
  assert.deepEqual(Object.keys(calls[0][2]).sort(), ["page_id", "page_type"]);
  window.siteAnalytics.track("work_open", {
    link_context: "note_body", destination: "https://site.test/work/?email=private#secret",
    email: "private@example.test", enabled: "true", id: "G-TEST", hostname: "site.test",
    note_id: "unrelated", user_id: "123", page_id: { prose: "private" }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[2])), { link_context: "note_body", destination: "/work/" });
  assert.deepEqual(JSON.parse(JSON.stringify(events.at(-1).detail.parameters)), { link_context: "note_body", destination: "/work/" });
  listeners["site:analytics-ready"]();
  assert.deepEqual(Object.keys(calls.at(-1)[2]).sort(), ["page_id", "page_type"]);
  const count = calls.length;
  window.siteAnalytics.track("unknown", { email: "private" });
  assert.equal(calls.length, count);
});

test("note body links distinguish collections, questions, Work and external domains", () => {
  const { links } = setup([
    "/work/", "/explore/", "/explore/a-question/", "/thinking/", "/thinking/another/",
    "/series/a-series/", "/experience/", "https://one.test/article/?secret=x#private",
    "https://two.test/article/", "/thinking/current/#section", "mailto:private@example.test", "/privacy/"
  ]);
  assert.deepEqual(links.map((link) => link.getAttribute("data-analytics-event")), [
    "work_open", "collection_open", "question_open", "collection_open", "note_open",
    "series_open", "experience_open", "reading_open", "reading_open", null, null, null
  ]);
  assert.equal(links[1].getAttribute("data-analytics-collection"), "explore");
  assert.equal(links[7].getAttribute("data-analytics-destination"), "https://one.test/article/");
  assert.equal(links[8].getAttribute("data-analytics-destination"), "https://two.test/article/");
});

test("malformed values and unsafe destination protocols cannot enter GA4", () => {
  const { window, calls } = setup();
  for (const destination of ["mailto:private@example.test", "https://user:secret@one.test/", "javascript:alert(1)"]) {
    window.siteAnalytics.track("reading_open", { destination, reading_id: "user@example.test", link_context: "free prose" });
    assert.deepEqual(Object.keys(calls.at(-1)[2]), []);
  }
});
