CREATE TABLE case_updates(id INTEGER PRIMARY KEY,case_id TEXT NOT NULL REFERENCES recovery_cases(observation_id) ON DELETE CASCADE,status TEXT NOT NULL,note TEXT NOT NULL,created_at TEXT NOT NULL);
PRAGMA user_version=12;
