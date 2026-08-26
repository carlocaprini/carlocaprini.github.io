# Professional outcome record

Analytics cannot establish whether published work influenced a real conversation. Keep one lightweight private CSV based on [`templates/professional-outcomes.csv`](templates/professional-outcomes.csv) and review the relevant rows each month.

| Field | Format |
| --- | --- |
| `conversation_date` | `YYYY-MM-DD`, when the conversation began |
| `discovery_source` | `linkedin`, `search`, `referral`, `direct` or `unknown` |
| `content_mentioned` | Stable public route or short public content title; blank when none was mentioned |
| `problem_area` | Broad Product & Engineering problem, without confidential detail |
| `engagement_type` | `review`, `advisory`, `other` or `unknown` |
| `qualified` | `yes`, `no` or `unknown` |
| `outcome` | `conversation`, `proposal`, `collaboration` or `no_further_action` |
| `note` | One short qualitative observation |

Do not add:

- names, company names, emails or profile URLs;
- GA4 identifiers, aggregate events, IP addresses or inferred visitor histories;
- confidential problem descriptions;
- CRM stages, lead scores or automated follow-up fields.

Self-reported discovery and explicit references such as “I found you through…” are sufficient. One conversation can be recorded without proving which anonymous site visit preceded it.

Keep the completed CSV outside this public repository. A quarterly review may count qualified conversations, proposals and collaborations, but it must not expose the private row-level record.
