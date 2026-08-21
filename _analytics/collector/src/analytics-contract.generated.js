/* GENERATED from contracts/analytics.json by scripts/generate_analytics_contract.mjs. Do not edit. */
export const ANALYTICS_CONTRACT = Object.freeze({
  "version": 1,
  "events": {
    "semantic": [
      "content_view",
      "collection_open",
      "note_open",
      "question_open",
      "series_open",
      "series_episode_open",
      "topic_select",
      "reading_open",
      "experience_open",
      "contact_section_open",
      "contact_open",
      "series_visual_open",
      "rss_open"
    ],
    "aggregateForwarded": [
      "collection_open",
      "note_open",
      "question_open",
      "series_open",
      "series_episode_open",
      "topic_select",
      "reading_open",
      "experience_open",
      "contact_section_open",
      "contact_open",
      "series_visual_open",
      "rss_open"
    ],
    "aggregateOnly": [
      "page_view",
      "consent_choice",
      "campaign_landing"
    ]
  },
  "sourceTypes": [
    "home",
    "thinking",
    "explore",
    "experience",
    "influences",
    "note",
    "question",
    "series",
    "page",
    "site"
  ],
  "targetTypes": [
    "home",
    "thinking",
    "explore",
    "experience",
    "influences",
    "note",
    "question",
    "series",
    "page",
    "site",
    "collection",
    "series_episode",
    "topic",
    "reading",
    "contact",
    "visual",
    "rss",
    "consent"
  ],
  "campaign": {
    "sources": [
      "linkedin",
      "medium",
      "newsletter",
      "manual",
      "qr"
    ],
    "mediums": [
      "social",
      "comment",
      "profile",
      "referral",
      "email",
      "direct",
      "offline"
    ],
    "editorialCampaigns": [
      "thinking",
      "building_my_ai_operating_system",
      "experience",
      "explore"
    ],
    "names": [
      "thinking",
      "building_my_ai_operating_system",
      "experience",
      "explore",
      "profile",
      "monthly_updates"
    ],
    "fixedContent": [
      "comment",
      "featured",
      "about",
      "article",
      "shared_link",
      "qr"
    ],
    "publicationContentPattern": "^[a-z0-9]+(?:_[a-z0-9]+)*_(?:text_post|single_image|carousel)$",
    "combinations": [
      {
        "source": "linkedin",
        "medium": "social",
        "campaigns": "editorial",
        "content": "publication"
      },
      {
        "source": "linkedin",
        "medium": "comment",
        "campaigns": "editorial",
        "content": [
          "comment"
        ]
      },
      {
        "source": "linkedin",
        "medium": "profile",
        "campaigns": [
          "profile"
        ],
        "content": [
          "featured",
          "about"
        ]
      },
      {
        "source": "medium",
        "medium": "referral",
        "campaigns": "editorial",
        "content": [
          "article"
        ]
      },
      {
        "source": "newsletter",
        "medium": "email",
        "campaigns": [
          "monthly_updates"
        ],
        "content": [
          "article"
        ]
      },
      {
        "source": "manual",
        "medium": "direct",
        "campaigns": "editorial",
        "content": [
          "shared_link"
        ]
      },
      {
        "source": "qr",
        "medium": "offline",
        "campaigns": "editorial",
        "content": [
          "qr"
        ]
      }
    ]
  }
});

export const CONTRACT_VERSION = ANALYTICS_CONTRACT.version;
export const EVENT_NAMES = new Set([
  ...ANALYTICS_CONTRACT.events.semantic,
  ...ANALYTICS_CONTRACT.events.aggregateOnly
]);
export const SOURCE_TYPES = new Set(ANALYTICS_CONTRACT.sourceTypes);
export const TARGET_TYPES = new Set(ANALYTICS_CONTRACT.targetTypes);
export const PUBLICATION_CONTENT_PATTERN = new RegExp(ANALYTICS_CONTRACT.campaign.publicationContentPattern);

export function validCampaignCombination(source, medium, campaign, content) {
  const rule = ANALYTICS_CONTRACT.campaign.combinations.find((candidate) =>
    candidate.source === source && candidate.medium === medium
  );
  if (!rule) return false;
  const campaigns = rule.campaigns === "editorial" ? ANALYTICS_CONTRACT.campaign.editorialCampaigns : rule.campaigns;
  if (!campaigns.includes(campaign)) return false;
  if (rule.content === "publication") return PUBLICATION_CONTENT_PATTERN.test(content);
  return rule.content.includes(content);
}
