ALTER TABLE recovery_jobs ADD COLUMN failures INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recovery_jobs ADD COLUMN failed_at TEXT;
CREATE INDEX followups_due ON recovery_exports(follow_up_at) WHERE notified_at IS NULL;
PRAGMA user_version=9;
