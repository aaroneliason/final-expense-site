-- 2026-11-06: call time picked on the thank-you page (/api/lead-update).
-- Eastern wall-clock start of a one-hour window, e.g. 2026-11-07T10:00 (10–11 AM ET).
-- Applied to the remote fe-leads database on 2026-11-06. New databases get it from schema.sql.
ALTER TABLE leads ADD COLUMN call_at TEXT;
