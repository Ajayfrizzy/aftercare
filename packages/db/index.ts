import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function openDatabase(path: string) {
  const db = new DatabaseSync(path);
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
    ];
    if (typeof version !== "number" || version > migrations.length + 1)
      throw new Error("Unsupported database version");
    for (const [index, file] of migrations.entries()) {
      if (version < index + 2)
        db.exec(readFileSync(new URL(file, import.meta.url), "utf8"));
    }
    db.exec("COMMIT");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
