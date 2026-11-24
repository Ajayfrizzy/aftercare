import { verifyAudit } from "../../packages/db/audit.ts";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { DatabaseSync } from "node:sqlite";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { credentials, preferences } from "@aftercare/contracts";

const derive = promisify(scrypt);
const lifetime = 7 * 24 * 3600;
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const sessionCookie =
  process.env.APP_BASE_URL === "http://127.0.0.1:3120"
    ? "__Host-aftercare-m2"
    : "__Host-aftercare";
function tokenOf(req: FastifyRequest) {
  const value = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : "";
}
export function identityRoutes(app: FastifyInstance, db: DatabaseSync) {
  const origin = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const attempts = new Map<string, { until: number; count: number }>();
  for (const action of ["register", "login"] as const) {
    app.post(`/api/v1/auth/${action}`, async (req, reply) => {
      if (req.headers.origin !== origin)
        return reply.code(403).send({ error: { code: "CSRF" } });
      const parsed = credentials.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(422)
          .send({ error: { code: "INVALID_CREDENTIAL_FIELDS" } });
      const now = Date.now();
      for (const [ip, entry] of attempts)
        if (entry.until <= now) attempts.delete(ip);
      const window = attempts.get(req.ip) ?? { until: now + 60000, count: 0 };
      attempts.set(req.ip, window);
      if (++window.count > 10)
        return reply.code(429).send({ error: { code: "RATE_LIMIT" } });
      const { email, password } = parsed.data;
      const row = db
        .prepare("SELECT id,password_hash FROM users WHERE email=?")
        .get(email);
      const stored = String(row?.password_hash ?? "").split(".");
      const salt =
        action === "login" && row ? stored[0] : randomBytes(16).toString("hex");
      const key = (await derive(password, salt, 64)) as Buffer;
      if (
        action === "login" &&
        (!row || !timingSafeEqual(key, Buffer.from(stored[1], "hex")))
      )
        return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
      const id = action === "register" ? randomUUID() : String(row?.id);
      const token = randomBytes(32).toString("hex");
      db.exec("BEGIN IMMEDIATE");
      try {
        if (
          action === "register" &&
          !db
            .prepare(
              "INSERT INTO users(id,email,password_hash) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING",
            )
            .run(id, email, `${salt}.${key.toString("hex")}`).changes
        ) {
          db.exec("ROLLBACK");
          return reply
            .code(409)
            .send({ error: { code: "ACCOUNT_UNAVAILABLE" } });
        }
        db.prepare(
          "DELETE FROM sessions WHERE expires_at<=? OR token_hash=?",
        ).run(now, digest(tokenOf(req)));
        db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
          digest(token),
          id,
          now + lifetime * 1000,
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return reply
        .header("cache-control", "no-store")
        .header("set-cookie", cookie(token, lifetime))
        .code(action === "register" ? 201 : 200)
        .send({ data: { id, email } });
    });
  }
  app.get("/api/v1/me/audit", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const owner = sessionOwner(db, req);
    if (!owner)
      return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
    return { data: verifyAudit(db, owner) };
  });
  app.get("/api/v1/me", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const user = db
      .prepare(
        "SELECT users.id,email,preferences FROM sessions JOIN users ON users.id=user_id WHERE token_hash=? AND expires_at>?",
      )
      .get(digest(tokenOf(req)), Date.now());
    return user
      ? { data: { ...user, preferences: JSON.parse(String(user.preferences)) } }
      : reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
  });
  app.patch("/api/v1/me/preferences", async (req, reply) => {
    const owner = sessionOwner(db, req);
    if (!owner)
      return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
    if (req.headers.origin !== origin)
      return reply.code(403).send({ error: { code: "CSRF" } });
    const input = preferences.safeParse(req.body);
    if (!input.success)
      return reply.code(422).send({ error: { code: "INVALID_PREFERENCES" } });
    db.prepare("UPDATE users SET preferences=? WHERE id=?").run(
      JSON.stringify(input.data),
      owner,
    );
    return { data: input.data };
  });
  app.post("/api/v1/auth/logout", async (req, reply) => {
    if (req.headers.origin !== origin)
      return reply.code(403).send({ error: { code: "CSRF" } });
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      digest(tokenOf(req)),
    );
    return reply.header("set-cookie", cookie("", 0)).code(204).send();
  });
}
function cookie(token: string, age: number) {
  return (
    sessionCookie +
    "=" +
    token +
    "; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=" +
    age
  );
}
export function sessionOwner(db: DatabaseSync, req: FastifyRequest) {
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?")
    .get(digest(tokenOf(req)), Date.now());
  return String(row?.user_id ?? "");
}
