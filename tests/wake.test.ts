import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../packages/db/index.ts";
import { wakeListener } from "../apps/api/wake.ts";
test("wake-only listener authenticates, rejects other paths and throttles repeated signals", async (t) => {
  const db = openDatabase(":memory:");
  const token = "ab".repeat(32);
  const app = wakeListener(db, token);
  t.after(async () => {
    await app.close();
    db.close();
  });
  const post = (url: string, auth?: string) =>
    app.inject({
      method: "POST",
      url,
      headers: auth ? { authorization: auth } : {},
    });
  assert.equal((await post("/wake")).statusCode, 401);
  assert.equal(
    (await post("/api/v1/purchases", "Bearer " + token)).statusCode,
    404,
  );
  assert.equal((await post("/wake?x=1", "Bearer " + token)).statusCode, 400);
  const accepted = await post("/wake", "Bearer " + token);
  assert.equal(accepted.statusCode, 204);
  assert.equal(accepted.body, "");
  assert.equal((await post("/wake", "Bearer " + token)).statusCode, 429);
});
