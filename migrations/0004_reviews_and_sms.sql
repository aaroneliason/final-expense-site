-- 2026-11-07: client reviews from the private review page (/api/review) + the confirmation-text result on leads.
-- Applied to the remote fe-leads database on 2026-11-07. New databases get both from schema.sql.
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  first_name TEXT NOT NULL,
  last_initial TEXT NOT NULL,
  city TEXT,
  relationship TEXT,        -- client | family | prospect
  text TEXT NOT NULL,       -- the person's own words, never edited
  contact TEXT,             -- optional, never shown; only to confirm who wrote it
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | removed
  decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews (created_at);
ALTER TABLE leads ADD COLUMN sms_status TEXT; -- confirmation text: sent | after-hours | not-configured | bad-number | failed-…
