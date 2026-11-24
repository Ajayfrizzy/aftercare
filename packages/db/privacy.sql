CREATE TABLE pending_file_deletions (
 artifact_id TEXT PRIMARY KEY, storage_root TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, retry_at INTEGER NOT NULL DEFAULT 0
);
PRAGMA user_version=11;
