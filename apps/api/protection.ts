import {
  recallNotices,
  researchPolicy,
} from "../../packages/connectors/protection.ts";
import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { sessionOwner } from "./identity.ts";
import { researchRequest, observation } from "@aftercare/contracts";
import { evaluate } from "../../packages/domain/protection.ts";

export async function protectionRoutes(
  app: FastifyInstance,
  {
    db,
    providers,
  }: {
    db: DatabaseSync;
    providers?: { gateway: URL; transport: typeof fetch };
  },
) {
  app.post<{ Params: { id: string } }>(
    "/purchases/:id/research",
    async (req, reply) => {
      reply.header("cache-control", "no-store");
      const owner = sessionOwner(db, req);
      if (!owner)
        return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
      if (
        req.headers.origin !==
        (process.env.APP_BASE_URL ?? "http://localhost:3000")
      )
        return reply.code(403).send({ error: { code: "CSRF" } });
      if (
        !db
          .prepare("SELECT id FROM purchases WHERE user_id=? AND id=?")
          .get(owner, req.params.id)
      )
        return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      const parsed = researchRequest.safeParse(req.body);
      if (!parsed.success)
        return reply.code(422).send({ error: { code: "INVALID_RESEARCH" } });
      if (!providers)
        return reply
          .code(503)
          .send({ error: { code: "PROVIDER_GATE_PENDING" } });
      const preferences = db
        .prepare("SELECT preferences FROM users WHERE id=?")
        .get(owner);
      if (!JSON.parse(String(preferences?.preferences)).researchConsent)
        return reply.code(403).send({ error: { code: "CONSENT_REQUIRED" } });
      const input = parsed.data;
      try {
        const results =
          input.kind === "recall"
            ? await recallNotices(input.brand, input.model, providers.transport)
            : await researchPolicy(
                providers.gateway,
                input.domain,
                input.region,
                providers.transport,
              );
        return {
          data: results,
          meta: { provenance: "retrieved", confidence: "requires_review" },
        };
      } catch {
        return reply
          .code(503)
          .send({ error: { code: "PROVIDER_UNAVAILABLE" } });
      }
    },
  );
  app.get("/protection", async (req, reply) => {
    reply.header("cache-control", "no-store");
    const owner = sessionOwner(db, req);
    if (!owner)
      return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
    const now = Date.now();
    const records = db
      .prepare(
        "SELECT o.id,o.purchase_id,o.record,p.record AS purchase FROM protection_observations o JOIN purchases p ON p.id=o.purchase_id AND p.user_id=o.user_id WHERE o.user_id=? ORDER BY o.created_at DESC",
      )
      .all(owner);
    const priority = { attention: 0, unknown: 1, monitoring: 2, closed: 3 };
    const data = records
      .map((row) => {
        const evidence = observation.parse(JSON.parse(String(row.record))),
          purchase = JSON.parse(String(row.purchase));
        return {
          id: row.id,
          purchaseId: row.purchase_id,
          merchant: purchase.merchant,
          kind: evidence.kind,
          source: evidence.source,
          potentialRefund:
            evidence.kind === "refund" && !evidence.received
              ? {
                  currency: evidence.currency,
                  minor: evidence.amountMinor,
                  dueAt: evidence.dueAt,
                }
              : null,
          region: evidence.region,
          observedAt: evidence.observedAt,
          ...evaluate(evidence, purchase, now),
        };
      })
      .sort(
        (a, b) =>
          priority[a.state] - priority[b.state] ||
          (a.nextCheckAt ?? "~").localeCompare(b.nextCheckAt ?? "~"),
      );
    return { data };
  });
  app.route<{ Params: { id: string } }>({
    method: ["GET", "POST"],
    url: "/purchases/:id/protection",
    bodyLimit: 8192,
    handler: async (req, reply) => {
      reply.header("cache-control", "no-store");
      const owner = sessionOwner(db, req);
      if (!owner)
        return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
      if (
        req.method === "POST" &&
        req.headers.origin !==
          (process.env.APP_BASE_URL ?? "http://localhost:3000")
      )
        return reply.code(403).send({ error: { code: "CSRF" } });
      const purchaseId = req.params.id;
      const row = db
        .prepare("SELECT record FROM purchases WHERE id=? AND user_id=?")
        .get(purchaseId, owner);
      if (!row) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      const purchase = JSON.parse(String(row.record));
      const now = Date.now(),
        checked = new Date(now).toISOString();
      if (req.method === "POST") {
        const input = observation.safeParse(req.body);
        if (!input.success)
          return reply
            .code(422)
            .send({ error: { code: "INVALID_OBSERVATION" } });
        const record = JSON.stringify(input.data),
          id = createHash("sha256")
            .update(JSON.stringify([owner, purchaseId, record]))
            .digest("hex");
        const insight = evaluate(input.data, purchase, now);
        db.exec("BEGIN IMMEDIATE");
        try {
          const write = db
            .prepare(
              "INSERT INTO protection_observations VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING",
            )
            .run(id, owner, purchaseId, record, checked);
          if (insight.nextCheckAt)
            db.prepare(
              "INSERT OR IGNORE INTO protection_checks VALUES(?,?,NULL)",
            ).run(id, new Date(insight.nextCheckAt).toISOString());
          db.exec("COMMIT");
          return reply
            .code(write.changes ? 201 : 200)
            .send({ data: { id, ...insight } });
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      }
      const records = db
        .prepare(
          "SELECT o.id,o.record,c.observation_id AS caseId FROM protection_observations o LEFT JOIN recovery_cases c ON c.observation_id=o.id WHERE o.user_id=? AND o.purchase_id=? ORDER BY o.created_at DESC,o.id",
        )
        .all(owner, purchaseId);
      const data = records.map((row) => {
        const evidence = observation.parse(JSON.parse(String(row.record)));
        return {
          id: row.id,
          caseId: row.caseId,
          evidence,
          ...evaluate(evidence, purchase, now),
        };
      });
      db.prepare(
        "UPDATE protection_checks SET last_checked_at=? WHERE last_checked_at IS NULL AND next_at<=? AND observation_id IN (SELECT id FROM protection_observations WHERE user_id=? AND purchase_id=?)",
      ).run(checked, checked, owner, purchaseId);
      return {
        data,
        meta: { mode: "on_read", checkedAt: checked, research: "unverified" },
      };
    },
  });
}
