import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const analyticsContract = JSON.parse(await readFile(
  new URL("../../contracts/analytics.json", import.meta.url),
  "utf8"
));
const ga4 = JSON.parse(await readFile(
  new URL("../../_analytics/measurement/ga4-configuration.json", import.meta.url),
  "utf8"
));
const workLayout = await readFile(new URL("../../_layouts/work.html", import.meta.url), "utf8");

test("GA4 reporting dimensions have unique event parameters and event scope", () => {
  const parameters = ga4.custom_dimensions.map((dimension) => dimension.event_parameter);
  assert.equal(new Set(parameters).size, parameters.length);
  assert.ok(parameters.includes("page_id"));
  assert.ok(parameters.includes("link_context"));
  assert.ok(parameters.includes("work_section"));
  assert.ok(parameters.includes("contact_method"));
  assert.ok(parameters.includes("platform"));
  for (const dimension of ga4.custom_dimensions) assert.equal(dimension.scope, "event");
});

test("the only configured Key Event is derived from the real Work contact path", () => {
  const keyEvents = ga4.derived_events.filter((event) => event.key_event);
  assert.deepEqual(keyEvents.map((event) => event.name), ["work_contact_open"]);
  assert.equal(keyEvents[0].source_event, "contact_open");
  assert.equal(keyEvents[0].conditions.link_context, "work_contact");
  assert.ok(analyticsContract.events.semantic.includes(keyEvents[0].source_event));
  assert.match(workLayout, /data-analytics-event="contact_open"/);
  assert.match(workLayout, /data-analytics-link-context="work_contact"/);
});

test("GA4 configuration contains no visitor or learner identity fields", () => {
  const source = JSON.stringify(ga4);
  for (const forbidden of ["email", "user_id", "client_id", "ip_address", "visitor_prose"]) {
    assert.doesNotMatch(source, new RegExp(forbidden, "i"));
  }
});
