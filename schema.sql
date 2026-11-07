-- D1 schema for quote-form leads (consent proof included). Apply with:
--   npx wrangler d1 execute fe-leads --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  coverage_for TEXT,
  age_range TEXT,
  state TEXT,
  coverage TEXT,
  tobacco TEXT,
  health TEXT,
  best_time TEXT,
  language TEXT,
  page TEXT,
  utm TEXT,
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consent_sha256 TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  country TEXT,
  region TEXT,
  turnstile_ok INTEGER NOT NULL DEFAULT 0,
  notified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  edit_token TEXT,          -- one-time token for optional details on the thank-you page
  edit_expires TEXT,        -- token expiry (2 hours after the lead)
  updated_at TEXT,
  call_at TEXT,             -- call time picked on the thank-you page: Eastern wall clock, start of a 1-hour window (YYYY-MM-DDTHH:MM)
  sms_status TEXT           -- confirmation text: sent | after-hours | not-configured | bad-number | failed-…
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);

-- Client reviews from the private review page (/api/review). Published only after Aaron approves them.
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
