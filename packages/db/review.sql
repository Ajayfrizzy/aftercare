ALTER TABLE audit_events ADD COLUMN previous_hash TEXT;
ALTER TABLE audit_events ADD COLUMN event_hash TEXT;
CREATE INDEX audit_owner_sequence ON audit_events(user_id,sequence);
CREATE TABLE audit_heads(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,hash TEXT NOT NULL);
CREATE TRIGGER audit_append AFTER INSERT ON audit_events BEGIN
 UPDATE audit_events SET previous_hash=COALESCE((SELECT hash FROM audit_heads WHERE user_id=new.user_id),'') WHERE sequence=new.sequence;
 UPDATE audit_events SET event_hash=event_hash(previous_hash,sequence,user_id,action,subject,created_at) WHERE sequence=new.sequence;
 INSERT INTO audit_heads VALUES(new.user_id,(SELECT event_hash FROM audit_events WHERE sequence=new.sequence)) ON CONFLICT(user_id) DO UPDATE SET hash=excluded.hash;
END;
CREATE TABLE review_fields(revision INTEGER PRIMARY KEY,owner TEXT NOT NULL,artifact TEXT NOT NULL,field TEXT NOT NULL,value TEXT,source TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(owner,artifact) REFERENCES artifacts(user_id,id) ON DELETE CASCADE);
CREATE INDEX review_lookup ON review_fields(owner,artifact,field,revision);
PRAGMA user_version=6;
