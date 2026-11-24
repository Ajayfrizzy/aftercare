ALTER TABLE recovery_drafts ADD COLUMN manifest TEXT NOT NULL DEFAULT '[]';
ALTER TABLE recovery_drafts ADD COLUMN redact TEXT NOT NULL DEFAULT '';
PRAGMA user_version=13;
