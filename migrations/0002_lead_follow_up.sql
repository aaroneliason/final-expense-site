-- 2026-11-06: optional details on the thank-you page (/api/lead-update).
-- Applied to the remote fe-leads database on 2026-11-06. New databases get these columns from schema.sql.
ALTER TABLE leads ADD COLUMN edit_token TEXT;
ALTER TABLE leads ADD COLUMN edit_expires TEXT;
ALTER TABLE leads ADD COLUMN updated_at TEXT;
