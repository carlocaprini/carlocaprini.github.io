CREATE TABLE IF NOT EXISTS daily_counts (
  day TEXT NOT NULL,
  event_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  link_context TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  PRIMARY KEY (
    day,
    event_name,
    source_type,
    source_id,
    target_type,
    target_id,
    link_context
  )
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS daily_counts_event_day
  ON daily_counts (event_name, day);

CREATE INDEX IF NOT EXISTS daily_counts_target_day
  ON daily_counts (target_type, target_id, day);
