import { createHash } from "node:crypto";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
export function eventHash(...fields: SQLInputValue[]) {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}
export function verifyAudit(db: DatabaseSync, owner: string) {
  let previous = "";
  let count = 0;
  for (const row of db
    .prepare("SELECT * FROM audit_events WHERE user_id=? ORDER BY sequence")
    .iterate(owner)) {
    const hash = eventHash(
      previous,
      row.sequence,
      owner,
      row.action,
      row.subject,
      row.created_at,
    );
    if (row.previous_hash !== previous || row.event_hash !== hash)
      return { valid: false, count };
    previous = hash;
    count++;
  }
  const head = db
    .prepare("SELECT hash FROM audit_heads WHERE user_id=?")
    .get(owner);
  return { valid: previous === (head?.hash ?? ""), count };
}
