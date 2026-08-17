CREATE TABLE IF NOT EXISTS daily_campaign_counts (
  day TEXT NOT NULL,
  landing_type TEXT NOT NULL,
  landing_id TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_content TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  PRIMARY KEY (
    day,
    landing_type,
    landing_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content
  )
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS daily_campaign_counts_campaign_day
  ON daily_campaign_counts (utm_campaign, day);

CREATE INDEX IF NOT EXISTS daily_campaign_counts_landing_day
  ON daily_campaign_counts (landing_type, landing_id, day);
