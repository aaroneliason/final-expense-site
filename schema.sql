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
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
