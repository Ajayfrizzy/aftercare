ALTER TABLE users ADD COLUMN preferences TEXT NOT NULL DEFAULT '{"locale":"en","timezone":"UTC","currency":"USD","researchConsent":false,"extractionConsent":false}';
CREATE TABLE audit_events(sequence INTEGER PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,action TEXT NOT NULL,subject TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TRIGGER purchase_added AFTER INSERT ON purchases BEGIN INSERT INTO audit_events(user_id,action,subject) VALUES(new.user_id,'purchase_created',new.id); END;
CREATE TRIGGER purchase_changed AFTER UPDATE ON purchases BEGIN INSERT INTO audit_events(user_id,action,subject) VALUES(new.user_id,'purchase_updated',new.id); END;
CREATE TRIGGER purchase_deleted AFTER DELETE ON purchases BEGIN INSERT INTO audit_events(user_id,action,subject) VALUES(old.user_id,'purchase_deleted',old.id); END;
CREATE TRIGGER receipt_reviewed AFTER INSERT ON receipt_evidence BEGIN INSERT INTO audit_events(user_id,action,subject) VALUES(new.user_id,'receipt_confirmed',new.artifact_id); END;
PRAGMA user_version=5;
