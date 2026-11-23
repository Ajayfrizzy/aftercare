CREATE TABLE artifacts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,sha TEXT NOT NULL,mime TEXT NOT NULL,bytes INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,sha),UNIQUE(user_id,id));
CREATE UNIQUE INDEX purchase_owner_id ON purchases(user_id,id);
CREATE TABLE receipt_evidence(user_id TEXT NOT NULL,artifact_id TEXT PRIMARY KEY,purchase_id TEXT NOT NULL,confirmed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id,artifact_id) REFERENCES artifacts(user_id,id) ON DELETE CASCADE,FOREIGN KEY(user_id,purchase_id) REFERENCES purchases(user_id,id) ON DELETE CASCADE);
PRAGMA user_version=4;
