import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { observation } from "../contracts/index.ts";
import { evaluate } from "../domain/protection.ts";

export function claimDue(db: DatabaseSync, now: number) {
  const token = randomUUID(),
    stamp = new Date(now).toISOString();
  return db
    .prepare(
      "UPDATE recovery_jobs SET lease_token=?, lease_until=?,attempts=attempts+1 WHERE id=(SELECT id FROM recovery_jobs WHERE NOT EXISTS (SELECT 1 FROM monitoring_preferences m JOIN protection_observations o ON o.user_id=m.user_id WHERE o.id=recovery_jobs.observation_id AND m.paused=1) AND completed_at IS NULL AND failed_at IS NULL AND due_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY due_at,id LIMIT 1) RETURNING id,observation_id,lease_token,failures",
    )
    .get(token, new Date(now + 30000).toISOString(), stamp, stamp);
}
export function checkDue(db: DatabaseSync, now = Date.now()) {
  const job = claimDue(db, now);
  if (!job) return false;
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db
      .prepare(
        "SELECT o.record AS evidence,p.record AS purchase FROM recovery_jobs j JOIN protection_observations o ON o.id=j.observation_id JOIN purchases p ON p.id=o.purchase_id AND p.user_id=o.user_id WHERE j.id=? AND j.lease_token=?",
      )
      .get(job.id, job.lease_token);
    if (row) {
      const insight = evaluate(
        observation.parse(JSON.parse(String(row.evidence))),
        JSON.parse(String(row.purchase)),
        now,
      );
      const stamp = new Date(now).toISOString();
      if (insight.state === "attention")
        db.prepare(
          "INSERT OR IGNORE INTO recovery_cases(observation_id,opened_at,reason) VALUES(?,?,?)",
        ).run(job.observation_id, stamp, insight.reason);
      const next =
        insight.nextCheckAt && Date.parse(insight.nextCheckAt) > now
          ? new Date(insight.nextCheckAt).toISOString()
          : null;
      db.prepare(
        "UPDATE recovery_jobs SET failures=0,completed_at=?,due_at=COALESCE(?,due_at),lease_token=NULL,lease_until=NULL WHERE id=? AND lease_token=?",
      ).run(next ? null : stamp, next, job.id, job.lease_token);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    const failures = Number(job.failures) + 1;
    const delay = 5000 * 2 ** Math.min(failures - 1, 4);
    db.prepare(
      "UPDATE recovery_jobs SET failures=?, failed_at=?, due_at=?, lease_token=NULL, lease_until=NULL WHERE id=? AND lease_token=?",
    ).run(
      failures,
      failures >= 5 ? new Date(now).toISOString() : null,
      new Date(now + delay).toISOString(),
      job.id,
      job.lease_token,
    );
    throw error;
  }
  return true;
}

export function notifyDue(db: DatabaseSync, now = Date.now()) {
  const stamp = new Date(now).toISOString();
  return db
    .prepare(
      "UPDATE recovery_exports SET notified_at=? WHERE approval_id IN (SELECT approval_id FROM recovery_exports WHERE NOT EXISTS (SELECT 1 FROM monitoring_preferences m JOIN protection_observations o ON o.user_id=m.user_id JOIN recovery_approvals a ON a.case_id=o.id WHERE a.id=recovery_exports.approval_id AND (m.paused=1 OR m.reminders=0)) AND notified_at IS NULL AND follow_up_at<=? ORDER BY follow_up_at LIMIT 50)",
    )
    .run(stamp, stamp).changes;
}
