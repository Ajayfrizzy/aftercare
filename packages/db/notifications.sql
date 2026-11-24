CREATE TABLE notification_reads (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_id TEXT NOT NULL,
 PRIMARY KEY(user_id,event_id)
);
CREATE VIEW journal_notifications AS
 SELECT user_id,'audit-'||sequence AS id,replace(action,'_',' ') AS label,created_at AS stamp,
 CASE WHEN action LIKE 'recovery_%' THEN '/cases#case-'||subject
 WHEN action IN ('purchase_created','purchase_updated') THEN '/vault#purchase-'||subject ELSE '/vault' END AS href
 FROM audit_events WHERE action LIKE 'recovery_%' OR action IN ('purchase_created','purchase_updated','receipt_confirmed')
 UNION ALL SELECT user_id,'observation-'||id,json_extract(record,'$.merchant')||' · '||json_extract(record,'$.kind')||' evidence recorded',created_at,'/protection#observation-'||id FROM protection_observations
 UNION ALL SELECT o.user_id,'followup-'||e.approval_id,'Follow up with '||json_extract(o.record,'$.merchant'),e.notified_at,'/cases#case-'||o.id FROM recovery_exports e JOIN recovery_approvals a ON a.id=e.approval_id JOIN protection_observations o ON o.id=a.case_id WHERE e.notified_at IS NOT NULL
 UNION ALL SELECT o.user_id,'failed-'||j.id,'Protection check needs investigation',j.failed_at,'/activity#job-'||o.id FROM recovery_jobs j JOIN protection_observations o ON o.id=j.observation_id WHERE j.failed_at IS NOT NULL;
PRAGMA user_version=14;
