CREATE TABLE purchases(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,record TEXT NOT NULL CHECK(json_valid(record)),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX vault_owner ON purchases(user_id,id);
CREATE UNIQUE INDEX vault_order ON purchases(user_id,lower(json_extract(record,'$.merchant')),json_extract(record,'$.orderNumber')) WHERE json_extract(record,'$.orderNumber')<>'';
PRAGMA user_version=3;
