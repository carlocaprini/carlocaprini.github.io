import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(root, "contracts/analytics.json");
const browserPath = resolve(root, "assets/js/analytics-contract.generated.js");
const workerPath = resolve(root, "_analytics/collector/src/analytics-contract.generated.js");
const checkMode = process.argv.includes("--check");

function unique(values, label) {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`${label} must be a non-empty array`);
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicates`);
}

function validate(contract) {
  if (!Number.isInteger(contract.version) || contract.version < 1) throw new Error("version must be a positive integer");
  unique(contract.events?.semantic, "events.semantic");
  unique(contract.events?.aggregateForwarded, "events.aggregateForwarded");
  unique(contract.events?.aggregateOnly, "events.aggregateOnly");
  unique(contract.sourceTypes, "sourceTypes");
  unique(contract.targetTypes, "targetTypes");
  unique(contract.campaign?.sources, "campaign.sources");
  unique(contract.campaign?.mediums, "campaign.mediums");
  unique(contract.campaign?.editorialCampaigns, "campaign.editorialCampaigns");
  unique(contract.campaign?.names, "campaign.names");
  unique(contract.campaign?.fixedContent, "campaign.fixedContent");
  if (!contract.campaign.publicationContentPattern) throw new Error("campaign.publicationContentPattern is required");
  new RegExp(contract.campaign.publicationContentPattern);

  const semantic = new Set(contract.events.semantic);
  for (const event of contract.events.aggregateForwarded) {
    if (!semantic.has(event)) throw new Error(`Aggregate-forwarded event is not semantic: ${event}`);
  }
  for (const type of contract.sourceTypes) {
    if (!contract.targetTypes.includes(type)) throw new Error(`Source type is absent from targetTypes: ${type}`);
  }
  for (const rule of contract.campaign.combinations || []) {
    if (!contract.campaign.sources.includes(rule.source)) throw new Error(`Unknown campaign source in rule: ${rule.source}`);
    if (!contract.campaign.mediums.includes(rule.medium)) throw new Error(`Unknown campaign medium in rule: ${rule.medium}`);
    const campaigns = rule.campaigns === "editorial" ? contract.campaign.editorialCampaigns : rule.campaigns;
    const content = rule.content === "publication" ? [] : rule.content;
    if (!Array.isArray(campaigns) || campaigns.some((value) => !contract.campaign.names.includes(value))) {
      throw new Error(`Invalid campaigns in ${rule.source}/${rule.medium} rule`);
    }
    if (!Array.isArray(content) || content.some((value) => !contract.campaign.fixedContent.includes(value))) {
      throw new Error(`Invalid content in ${rule.source}/${rule.medium} rule`);
    }
  }
}

function sharedMatcherBody() {
  return `
  const rule = contract.campaign.combinations.find((candidate) =>
    candidate.source === source && candidate.medium === medium
  );
  if (!rule) return false;
  const campaigns = rule.campaigns === "editorial" ? contract.campaign.editorialCampaigns : rule.campaigns;
  if (!campaigns.includes(campaign)) return false;
  if (rule.content === "publication") return publicationContentPattern.test(content);
  return rule.content.includes(content);`;
}

function browserSource(contract) {
  const json = JSON.stringify(contract, null, 2).replace(/^/gm, "  ");
  return `/* GENERATED from contracts/analytics.json by scripts/generate_analytics_contract.mjs. Do not edit. */
(function (global) {
  "use strict";

  var contract = ${json.trimStart()};
  var publicationContentPattern = new RegExp(contract.campaign.publicationContentPattern);

  function validCampaignCombination(source, medium, campaign, content) {${sharedMatcherBody()}
  }

  global.siteAnalyticsContract = Object.freeze({
    version: contract.version,
    semanticEvents: Object.freeze(contract.events.semantic.slice()),
    aggregateForwardedEvents: Object.freeze(contract.events.aggregateForwarded.slice()),
    aggregateOnlyEvents: Object.freeze(contract.events.aggregateOnly.slice()),
    sourceTypes: Object.freeze(contract.sourceTypes.slice()),
    targetTypes: Object.freeze(contract.targetTypes.slice()),
    campaign: Object.freeze(contract.campaign),
    publicationContentPattern: publicationContentPattern,
    validCampaignCombination: validCampaignCombination
  });
})(window);
`;
}

function workerSource(contract) {
  const json = JSON.stringify(contract, null, 2);
  return `/* GENERATED from contracts/analytics.json by scripts/generate_analytics_contract.mjs. Do not edit. */
export const ANALYTICS_CONTRACT = Object.freeze(${json});

export const CONTRACT_VERSION = ANALYTICS_CONTRACT.version;
export const EVENT_NAMES = new Set([
  ...ANALYTICS_CONTRACT.events.semantic,
  ...ANALYTICS_CONTRACT.events.aggregateOnly
]);
export const SOURCE_TYPES = new Set(ANALYTICS_CONTRACT.sourceTypes);
export const TARGET_TYPES = new Set(ANALYTICS_CONTRACT.targetTypes);
export const PUBLICATION_CONTENT_PATTERN = new RegExp(ANALYTICS_CONTRACT.campaign.publicationContentPattern);

export function validCampaignCombination(source, medium, campaign, content) {${sharedMatcherBody().replaceAll("contract.", "ANALYTICS_CONTRACT.").replaceAll("publicationContentPattern", "PUBLICATION_CONTENT_PATTERN")}
}
`;
}

async function writeOrCheck(path, expected) {
  if (!checkMode) {
    await writeFile(path, expected);
    process.stdout.write(`Generated ${path.replace(`${root}/`, "")}\n`);
    return;
  }

  const actual = await readFile(path, "utf8").catch(() => "");
  if (actual !== expected) throw new Error(`${path.replace(`${root}/`, "")} is stale. Run npm run analytics:contract:generate`);
}

const contract = JSON.parse(await readFile(contractPath, "utf8"));
validate(contract);
await writeOrCheck(browserPath, browserSource(contract));
await writeOrCheck(workerPath, workerSource(contract));
process.stdout.write(checkMode ? "Analytics contract outputs are current.\n" : "Analytics contract generation complete.\n");
