CREATE TABLE recovery_jobs (
 id INTEGER PRIMARY KEY,
 observation_id TEXT NOT NULL UNIQUE REFERENCES protection_observations(id) ON DELETE CASCADE,
 due_at TEXT NOT NULL, lease_token TEXT, lease_until TEXT,
 attempts INTEGER NOT NULL DEFAULT 0, completed_at TEXT
);
CREATE INDEX recovery_due ON recovery_jobs(completed_at,due_at,lease_until);
CREATE TABLE recovery_cases (
 observation_id TEXT PRIMARY KEY REFERENCES protection_observations(id) ON DELETE CASCADE,
 opened_at TEXT NOT NULL,reason TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'evidence_ready'
);
INSERT INTO recovery_jobs(observation_id,due_at) SELECT id,created_at FROM protection_observations;
CREATE TRIGGER observe_recovery AFTER INSERT ON protection_observations BEGIN
 INSERT INTO recovery_jobs(observation_id,due_at) VALUES(new.id,new.created_at);
END;
PRAGMA user_version=8;
CREATE TABLE recovery_drafts (
 case_id TEXT NOT NULL REFERENCES recovery_cases(observation_id) ON DELETE CASCADE,version INTEGER NOT NULL,
 recipient TEXT NOT NULL,body TEXT NOT NULL,content_hash TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(case_id,version)
);
CREATE TABLE recovery_approvals(id TEXT PRIMARY KEY,case_id TEXT NOT NULL,version INTEGER NOT NULL,content_hash TEXT NOT NULL,expires_at TEXT NOT NULL,consumed_at TEXT,revoked_at TEXT,FOREIGN KEY(case_id,version) REFERENCES recovery_drafts(case_id,version) ON DELETE CASCADE);
CREATE TABLE recovery_exports(approval_id TEXT PRIMARY KEY REFERENCES recovery_approvals(id) ON DELETE CASCADE,created_at TEXT NOT NULL,follow_up_at TEXT NOT NULL,notified_at TEXT);
