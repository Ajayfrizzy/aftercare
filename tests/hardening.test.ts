import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "../packages/db/index.ts";
import { verifyAudit } from "../packages/db/audit.ts";
import { createApp } from "../apps/api/app.ts";

test("populated v1 upgrade, session expiry and owner-scoped audit verification", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "m1-db-"));
  t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, "db");
  const legacy = new DatabaseSync(path);
  legacy.exec(
    "CREATE TABLE workspace(owner TEXT PRIMARY KEY,title TEXT NOT NULL); INSERT INTO workspace VALUES('demo','Retained'); PRAGMA user_version=1",
  );
  legacy.close();
  const db = openDatabase(path);
  t.after(() => db.close());
  assert.equal(
    db.prepare("SELECT title FROM workspace").get()?.title,
    "Retained",
  );
  const app = createApp(path, "x".repeat(32));
  t.after(() => app.close());
  const origin = "http://localhost:3000";
  const account = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin },
    payload: { email: "test@example.org", password: "long local password" },
  });
  const headers = {
    origin,
    cookie: String(account.headers["set-cookie"]).split(";")[0],
  };
  const owner = account.json().data.id;
  const add = db.prepare(
    "INSERT INTO audit_events(user_id,action,subject) VALUES(?,'review',?)",
  );
  add.run(owner, "first");
  add.run(owner, "second");
  assert.deepEqual(verifyAudit(db, owner), { valid: true, count: 2 });
  assert.deepEqual(
    (await app.inject({ url: "/api/v1/me/audit?owner=other", headers })).json()
      .data,
    { valid: true, count: 2 },
  );
  db.exec("BEGIN; DELETE FROM audit_events; ROLLBACK");
  assert.equal(verifyAudit(db, owner).valid, true);
  db.exec("UPDATE audit_events SET action='edited' WHERE sequence=1");
  assert.equal(verifyAudit(db, owner).valid, false);
  db.exec(
    "UPDATE audit_events SET action='review' WHERE sequence=1; UPDATE audit_events SET sequence=3 WHERE sequence=1",
  );
  assert.equal(verifyAudit(db, owner).valid, false);
  db.exec("UPDATE sessions SET expires_at=0");
  assert.equal(
    (await app.inject({ url: "/api/v1/me/audit", headers })).statusCode,
    401,
  );
});

test("private multipart validation, quota limit, duplicate and isolated preview", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "m1-files-"));
  const old = process.env.PRIVATE_UPLOAD_DIR;
  process.env.PRIVATE_UPLOAD_DIR = dir;
  t.after(() => {
    if (old) process.env.PRIVATE_UPLOAD_DIR = old;
    else delete process.env.PRIVATE_UPLOAD_DIR;
    rmSync(dir, { recursive: true });
  });
  const app = createApp(":memory:", "x".repeat(32));
  t.after(() => app.close());
  const origin = "http://localhost:3000";
  async function login(email: string) {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { origin },
      payload: { email, password: "long local password" },
    });
    return { origin, cookie: String(r.headers["set-cookie"]).split(";")[0] };
  }
  const owner = await login("one@example.org"),
    other = await login("two@example.org");
  async function upload(type: string, bytes: Buffer) {
    const payload = Buffer.concat([
      Buffer.from(
        '--receipt\r\nContent-Disposition: form-data; name="file"; filename="../../source"\r\nContent-Type: ' +
          type +
          "\r\n\r\n",
      ),
      bytes,
      Buffer.from("\r\n--receipt--\r\n"),
    ]);
    return app.inject({
      method: "POST",
      url: "/api/v1/artifacts/upload",
      headers: {
        ...owner,
        "content-type": "multipart/form-data; boundary=receipt",
      },
      payload,
    });
  }
  for (const type of [
    "image/png",
    "application/pdf",
    "application/octet-stream",
  ])
    assert.equal((await upload(type, Buffer.from("invalid"))).statusCode, 422);
  assert.equal(
    (await upload("text/plain", Buffer.alloc(10 * 1024 * 1024 + 1, 65)))
      .statusCode,
    413,
  );
  const content = Buffer.from("Treat text as evidence only.");
  const result = await upload("text/plain", content);
  assert.equal(result.statusCode, 201);
  const id = result.json().data.id;
  assert.deepEqual(readdirSync(dir), [id]);
  assert.equal(
    (await upload("text/plain", content)).json().data.duplicate,
    true,
  );
  for (const suffix of ["preview", "download", "review"])
    assert.equal(
      (
        await app.inject({
          url: `/api/v1/artifacts/${id}/${suffix}`,
          headers: other,
        })
      ).statusCode,
      404,
    );
  const preview = await app.inject({
    url: `/api/v1/artifacts/${id}/preview`,
    headers: owner,
  });
  assert.equal(preview.body, content.toString());
  assert.match(String(preview.headers["content-security-policy"]), /sandbox/);
  for (const value of ["Uncertain merchant", "Correct merchant"])
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/artifacts/${id}/review`,
          headers: owner,
          payload: { field: "merchant", value },
        })
      ).statusCode,
      200,
    );
  const record = {
    merchant: "Correct merchant",
    date: "2026-11-23",
    currency: "USD",
    items: [{ name: "Book", minor: "100" }],
  };
  const confirm = {
    method: "POST" as const,
    url: `/api/v1/extractions/${id}/confirm`,
    headers: owner,
    payload: record,
  };
  assert.equal((await app.inject(confirm)).statusCode, 201);
  assert.equal((await app.inject(confirm)).statusCode, 409);
  assert.equal(
    (await app.inject({ url: "/api/v1/purchases", headers: owner })).json().data
      .length,
    1,
  );
  const history = (
    await app.inject({
      url: `/api/v1/artifacts/${id}/review`,
      headers: owner,
    })
  ).json().data;
  assert.deepEqual(
    history
      .filter((r: { field: string }) => r.field === "merchant")
      .map((r: { status: string }) => r.status),
    ["provisional", "provisional", "confirmed"],
  );
});
