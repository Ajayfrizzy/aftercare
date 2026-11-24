import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/app.ts";

test("registration, origin enforcement, login, profile and revoked session", async (t) => {
  const app = createApp(":memory:", "x".repeat(32));
  t.after(() => app.close());
  const payload = {
    email: "person@example.org",
    password: "long example password",
  };
  const headers = { origin: "http://localhost:3000" };
  const register = {
    method: "POST" as const,
    url: "/api/v1/auth/register",
    payload,
  };
  assert.equal((await app.inject(register)).statusCode, 403);
  const created = await app.inject({ ...register, headers });
  assert.equal(created.statusCode, 201);
  const login = await app.inject({
    ...register,
    url: "/api/v1/auth/login",
    headers,
  });
  assert.equal(login.statusCode, 200);
  const cookie = String(login.headers["set-cookie"]).split(";")[0];
  assert.equal(
    (await app.inject({ url: "/api/v1/me", headers: { cookie } })).json().data
      .email,
    payload.email,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { ...headers, cookie },
      })
    ).statusCode,
    204,
  );
  assert.equal(
    (await app.inject({ url: "/api/v1/me", headers: { cookie } })).statusCode,
    401,
  );
});

test("manual purchase, duplicate rejection, owner corrections, archive and delete", async (t) => {
  const app = createApp(":memory:", "x".repeat(32));
  t.after(() => app.close());
  const origin = "http://localhost:3000";
  const account = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin },
    payload: { email: "owner@example.org", password: "synthetic-secret" },
  });
  const headers = {
    origin,
    cookie: String(account.headers["set-cookie"]).split(";")[0],
  };
  const payload = {
    merchant: "Example",
    date: "2026-11-23",
    currency: "USD",
    orderNumber: "order1",
    items: [{ name: "Book", minor: "1500" }],
  };
  const create = {
    method: "POST" as const,
    url: "/api/v1/purchases",
    headers,
    payload,
  };
  const result = await app.inject(create);
  assert.equal(result.statusCode, 201);
  assert.equal((await app.inject(create)).statusCode, 409);
  const url = `${create.url}/${result.json().data.id}`;
  assert.equal(
    (
      await app.inject({
        method: "PATCH",
        url,
        headers,
        payload: { ...payload, archived: true },
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await app.inject({ url: `${create.url}?archived=true&q=Book`, headers })
    ).json().data.length,
    1,
  );
  assert.equal(
    (await app.inject({ method: "DELETE", url, headers })).statusCode,
    204,
  );
  assert.equal((await app.inject({ url, headers })).statusCode, 404);
});

test("records export requires an owner and omits other accounts and credentials", async (t) => {
  const app = createApp(":memory:", "x".repeat(32));
  t.after(() => app.close());
  const url = "/api/v1/exports/my-data";
  assert.equal((await app.inject({ url })).statusCode, 401);
  async function register(email: string) {
    return app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { origin: "http://localhost:3000" },
      payload: { email, password: "synthetic export password" },
    });
  }
  const owner = await register("first@example.org");
  await register("second@example.org");
  const result = await app.inject({
    url,
    headers: { cookie: String(owner.headers["set-cookie"]).split(";")[0] },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().data.profile.email, "first@example.org");
  assert.doesNotMatch(result.body, /second@example|password_hash|token_hash/);
  assert.match(String(result.headers["content-disposition"]), /attachment/);
});
