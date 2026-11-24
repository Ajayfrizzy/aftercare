CREATE TABLE protection_observations(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL,purchase_id TEXT NOT NULL,
 record TEXT NOT NULL CHECK(json_valid(record)),created_at TEXT NOT NULL,
 FOREIGN KEY(user_id,purchase_id) REFERENCES purchases(user_id,id) ON DELETE CASCADE
);
CREATE INDEX protection_owner_purchase ON protection_observations(user_id,purchase_id);
CREATE TABLE protection_checks(observation_id TEXT PRIMARY KEY REFERENCES protection_observations(id) ON DELETE CASCADE,next_at TEXT NOT NULL,last_checked_at TEXT);
CREATE INDEX protection_due ON protection_checks(next_at);
PRAGMA user_version=7;
