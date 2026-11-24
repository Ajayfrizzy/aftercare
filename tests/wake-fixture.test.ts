import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWakeFixture } from "../scripts/wake-fixture.ts";
import { openDatabase } from "../packages/db/index.ts";
import { notifyDue } from "../packages/agent/recovery.ts";
import { createApp } from "../apps/api/app.ts";
test("trial follow-up persists across API restart, catches up once and survives duplicate delivery", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "wake-fixture-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "trial.sqlite"),
    due = Date.now() + 60000,
    stamp = new Date(due).toISOString();
  assert.deepEqual(createWakeFixture(path, stamp), {
    path,
    follow_up_at: stamp,
    notified_at: null,
  });
  assert.throws(() => createWakeFixture(path, stamp), /EEXIST/);
  for (let i = 0; i < 2; i++) {
    const app = createApp(path, "t".repeat(32));
    await app.listen({ host: "127.0.0.1", port: 0 });
    await app.close();
  }
  for (const [time, count] of [
    [due - 1, 0],
    [due + 120000, 1],
    [due + 180000, 0],
  ]) {
    const db = openDatabase(path);
    try {
      assert.equal(notifyDue(db, time), count);
    } finally {
      db.close();
    }
  }
  const db = openDatabase(path);
  assert.deepEqual(
    db
      .prepare("SELECT stamp FROM trial_notifications")
      .all()
      .map((r) => r.stamp),
    [new Date(due + 120000).toISOString()],
  );
  db.close();
});
