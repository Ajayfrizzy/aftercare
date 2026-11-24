import Fastify from "fastify";
import { createHash, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { checkDue, notifyDue } from "../../packages/agent/recovery.ts";

export function wakeListener(db: DatabaseSync, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw Error("Configure a dedicated random 32-byte hex wake token");
  const digest = (s: string) => createHash("sha256").update(s).digest();
  const expected = digest("Bearer " + token);
  const server = Fastify({ logger: false, bodyLimit: 1 });
  let next = 0;
  server.setNotFoundHandler((_req, reply) => reply.code(404).send());
  server.setErrorHandler((_error, _req, reply) => reply.code(503).send());
  server.post("/wake", async (req, reply) => {
    reply.header("cache-control", "no-store");
    if (req.raw.url !== "/wake" || req.body !== undefined)
      return reply.code(400).send();
    if (!timingSafeEqual(expected, digest(req.headers.authorization ?? "")))
      return reply.code(401).send();
    const now = Date.now();
    if (now < next)
      return reply
        .header("retry-after", Math.ceil((next - now) / 1000))
        .code(429)
        .send();
    next = now + 60000;
    notifyDue(db, now);
    checkDue(db, now);
    return reply.code(204).send();
  });
  return server;
}
