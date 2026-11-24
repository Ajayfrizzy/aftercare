import { resolve } from "node:path";
import { cleanReceipts } from "./purge.ts";
import { recoveryRoutes } from "./recovery.ts";
import { checkDue, notifyDue } from "../../packages/agent/recovery.ts";
import { protectionRoutes } from "./protection.ts";
import { receiptRoutes } from "./receipts.ts";
import { vaultRoutes } from "./vault.ts";
import { identityRoutes } from "./identity.ts";
import Fastify from "fastify";
import { createHash, timingSafeEqual } from "node:crypto";
import { overview, overviewQuery } from "@aftercare/contracts";
import { openDatabase } from "@aftercare/db";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function createApp(path: string, secret: string) {
  if (secret.length < 32)
    throw new Error("Set a random DEMO_SECRET of at least 32 characters");
  const expected = digest(
    `Basic ${Buffer.from(`demo:${secret}`).toString("base64")}`,
  );
  const db = openDatabase(path);
  const app = Fastify({ logger: false, bodyLimit: 1024 });
  const storageRoot = resolve(
    process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads",
  );
  const timer = setInterval(() => {
    try {
      cleanReceipts(db, storageRoot);
      notifyDue(db);
      checkDue(db);
    } catch {
      app.log.error("Local recovery check failed");
    }
  }, 5000);
  timer.unref();
  app.addHook("onClose", async () => clearInterval(timer));
  identityRoutes(app, db, storageRoot);
  app.register(recoveryRoutes, { prefix: "/api/v1/cases", db });
  app.register(protectionRoutes, { prefix: "/api/v1", db });
  app.register(receiptRoutes, { prefix: "/api/v1", db });
  app.register(vaultRoutes, { prefix: "/api/v1/purchases", db });
  app.addHook("onClose", async () => db.close());
  app.get("/api/v1/overview", async (request, reply) => {
    reply.header("cache-control", "private, no-store");
    if (
      !timingSafeEqual(expected, digest(request.headers.authorization ?? ""))
    ) {
      return reply
        .code(401)
        .header("www-authenticate", 'Basic realm="Aftercare demo"')
        .send({ code: "UNAUTHORIZED" });
    }
    if (!overviewQuery.safeParse(request.query).success) {
      return reply.code(400).send({ code: "INVALID_QUERY" });
    }
    const row = db
      .prepare("SELECT title FROM workspace WHERE owner = ?")
      .get("demo");
    return overview.parse({
      title: row?.title,
      monitoringMode: "on_wake",
      lastCheckedAt: null,
    });
  });
  return app;
}
