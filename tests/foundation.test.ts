import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../apps/api/app.ts";
import { openDatabase } from "../packages/db/index.ts";
import { overview } from "../packages/contracts/index.ts";

test("database reopens with persisted data, WAL and foreign keys", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "aftercare-"));
  t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, "db");
  const first = openDatabase(path);
  first.exec("UPDATE workspace SET title='Persisted'");
  first.close();
  const db = openDatabase(path);
  t.after(() => db.close());
  assert.equal(db.prepare("PRAGMA foreign_keys").get()?.foreign_keys, 1);
  assert.equal(db.prepare("PRAGMA journal_mode").get()?.journal_mode, "wal");
  assert.equal(
    db.prepare("SELECT title FROM workspace").get()?.title,
    "Persisted",
  );
});

test("private overview requires the demo identity and validates the response", async (t) => {
  const secret = "a".repeat(32);
  const app = createApp(":memory:", secret);
  t.after(() => app.close());
  for (const [user, status] of [
    ["", 401],
    ["other", 401],
    ["demo", 200],
  ] as const) {
    const response = await app.inject({
      url: "/api/v1/overview",
      headers: {
        authorization: `Basic ${Buffer.from(`${user}:${secret}`).toString("base64")}`,
      },
    });
    assert.equal(response.statusCode, status);
    if (status === 200)
      assert.equal(overview.parse(response.json()).lastCheckedAt, null);
  }
});

test("missing and malformed credentials fail closed", async (t) => {
  const app = createApp(":memory:", "x".repeat(32));
  t.after(() => app.close());
  for (const authorization of ["", "Basic invalid", "Bearer invalid"]) {
    const result = await app.inject({
      url: "/api/v1/overview",
      headers: { authorization },
    });
    assert.equal(result.statusCode, 401);
    assert.deepEqual(result.json(), { code: "UNAUTHORIZED" });
  }
});

test("query parameters cannot select another workspace", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "aftercare-owner-"));
  t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, "db");
  const db = openDatabase(path);
  db.exec("INSERT INTO workspace VALUES ('other','Private other journal')");
  db.close();
  const secret = "x".repeat(32);
  const app = createApp(path, secret);
  t.after(() => app.close());
  const response = await app.inject({
    url: "/api/v1/overview?owner=other",
    headers: {
      authorization: `Basic ${Buffer.from(`demo:${secret}`).toString("base64")}`,
    },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.includes("Private other journal"), false);
});

test("fresh migrations reproduce schema, version and initial owner", () => {
  function snapshot() {
    const db = openDatabase(":memory:");
    try {
      return [
        db.prepare("SELECT name, sql FROM sqlite_schema ORDER BY name").all(),
        db.prepare("PRAGMA user_version").get(),
        db.prepare("SELECT * FROM workspace ORDER BY owner").all(),
      ];
    } finally {
      db.close();
    }
  }
  const first = snapshot();
  assert.deepEqual(Object.values(first[1] ?? {})[0], 12);
  assert.deepEqual(first, snapshot());
});
