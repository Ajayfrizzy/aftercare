import { eventHash } from "./audit.ts";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function openDatabase(path: string) {
  const db = new DatabaseSync(path);
  db.function("event_hash", { varargs: true }, eventHash);
  try {
    db.exec(
      "PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; BEGIN IMMEDIATE",
    );
    const version = db.prepare("PRAGMA user_version").get()?.user_version;
    if (version === 0) {
      db.exec(
        "CREATE TABLE workspace(owner TEXT PRIMARY KEY, title TEXT NOT NULL); INSERT INTO workspace VALUES ('demo', 'Your protection journal'); PRAGMA user_version=1",
      );
    }
    const migrations = [
      "identity.sql",
      "vault.sql",
      "receipts.sql",
      "preferences.sql",
      "review.sql",
      "protection.sql",
      "recovery.sql",
      "recovery-retries.sql",
    ];
    if (typeof version !== "number" || version > migrations.length + 1)
      throw new Error("Unsupported database version");
    for (const [index, file] of migrations.entries()) {
      if (version < index + 2)
        db.exec(readFileSync(new URL(file, import.meta.url), "utf8"));
    }
    if (version < 6) {
      for (const row of db
        .prepare("SELECT * FROM audit_events ORDER BY sequence")
        .all()) {
        const previous = String(
          db
            .prepare("SELECT hash FROM audit_heads WHERE user_id=?")
            .get(row.user_id)?.hash ?? "",
        );
        const hash = eventHash(
          previous,
          row.sequence,
          row.user_id,
          row.action,
          row.subject,
          row.created_at,
        );
        db.prepare(
          "UPDATE audit_events SET previous_hash=?,event_hash=? WHERE sequence=?",
        ).run(previous, hash, row.sequence);
        db.prepare("INSERT OR REPLACE INTO audit_heads VALUES(?,?)").run(
          row.user_id,
          hash,
        );
      }
    }
    db.exec("COMMIT");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
