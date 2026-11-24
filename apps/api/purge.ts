import { unlinkSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

export function cleanReceipts(
  db: DatabaseSync,
  root: string,
  now = Date.now(),
) {
  const jobs = db
    .prepare(
      "SELECT artifact_id FROM pending_file_deletions WHERE storage_root=? AND retry_at<=? ORDER BY retry_at,artifact_id LIMIT 32",
    )
    .all(root, now);
  for (const job of jobs) {
    const id = String(job.artifact_id);
    try {
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
        throw Error("Invalid storage key");
      unlinkSync(join(root, id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        db.prepare(
          "UPDATE pending_file_deletions SET attempts=attempts+1,retry_at=? WHERE artifact_id=?",
        ).run(now + 60000, id);
        continue;
      }
    }
    db.prepare("DELETE FROM pending_file_deletions WHERE artifact_id=?").run(
      id,
    );
  }
}
