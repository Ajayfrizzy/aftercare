CREATE TABLE monitoring_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,paused INTEGER NOT NULL CHECK(paused IN(0,1)),reminders INTEGER NOT NULL CHECK(reminders IN(0,1)));
PRAGMA user_version=10;
