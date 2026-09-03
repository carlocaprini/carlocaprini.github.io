/* GENERATED from contracts/analytics.json by scripts/generate_analytics_contract.mjs. Do not edit. */
(function (global) {
  "use strict";

  var contract = {
    "version": 1,
    "parameters": {
      "common": [
        "page_type",
        "page_id",
        "page_topic",
        "page_series",
        "page_episode",
        "link_context"
      ],
      "byEvent": {
        "content_view": [],
        "collection_open": [
          "collection",
          "destination"
        ],
        "note_open": [
          "note_id",
          "destination"
        ],
        "question_open": [
          "question_id",
          "destination"
        ],
        "series_open": [
          "series_id",
          "destination"
        ],
        "series_episode_open": [
          "series_id",
          "episode_number",
          "note_id",
          "direction",
          "destination"
        ],
        "topic_select": [
          "topic",
          "interaction"
        ],
        "reading_open": [
          "reading_id",
          "destination"
        ],
        "experience_open": [
          "destination"
        ],
        "work_open": [
          "destination"
        ],
        "work_section_view": [
          "work_section"
        ],
        "contact_section_open": [
          "destination"
        ],
        "contact_open": [
          "contact_method",
          "destination"
        ],
        "social_profile_open": [
          "platform",
          "destination"
        ],
        "series_visual_open": [
          "series_id",
          "episode_number",
          "service",
          "interaction",
          "destination"
        ],
        "rss_open": [
          "destination"
        ]
      }
    },
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
        "work_open",
        "work_section_view",
        "contact_section_open",
        "contact_open",
        "social_profile_open",
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
        "work_open",
        "work_section_view",
        "contact_section_open",
        "contact_open",
        "social_profile_open",
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
      "work",
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
      "work",
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
      "social_profile",
      "work_section",
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
        "premium_subscription",
        "monthly_updates"
      ],
      "fixedContent": [
        "comment",
        "featured",
        "about",
        "website_button",
        "article",
        "shared_link",
        "qr"
      ],
      "publicationContentPattern": "^[a-z0-9]+(?:_[a-z0-9]+)*_(?:text_post|single_image|carousel)$",
      "combinations": [
        {
          "source": "linkedin",
          "medium": "profile",
          "campaigns": [
            "premium_subscription"
          ],
          "content": [
            "website_button"
          ]
        },
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
  };
  var publicationContentPattern = new RegExp(contract.campaign.publicationContentPattern);

  function validCampaignCombination(source, medium, campaign, content) {
  return contract.campaign.combinations.some((rule) => {
  if (rule.source !== source || rule.medium !== medium) return false;
  const campaigns = rule.campaigns === "editorial" ? contract.campaign.editorialCampaigns : rule.campaigns;
  if (!campaigns.includes(campaign)) return false;
  if (rule.content === "publication") return publicationContentPattern.test(content);
  return rule.content.includes(content);
  });
  }

  global.siteAnalyticsContract = Object.freeze({
    version: contract.version,
    semanticEvents: Object.freeze(contract.events.semantic.slice()),
    parameters: Object.freeze(contract.parameters),
    aggregateForwardedEvents: Object.freeze(contract.events.aggregateForwarded.slice()),
    aggregateOnlyEvents: Object.freeze(contract.events.aggregateOnly.slice()),
    sourceTypes: Object.freeze(contract.sourceTypes.slice()),
    targetTypes: Object.freeze(contract.targetTypes.slice()),
    campaign: Object.freeze(contract.campaign),
    publicationContentPattern: publicationContentPattern,
    validCampaignCombination: validCampaignCombination
  });
})(window);
