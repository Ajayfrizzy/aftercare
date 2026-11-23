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
