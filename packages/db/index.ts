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
    } else if (version !== 1 && version !== 2) {
      throw new Error("Unsupported database version");
    }
    if (version !== 2)
      db.exec(readFileSync(new URL("./identity.sql", import.meta.url), "utf8"));
    db.exec("COMMIT");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
