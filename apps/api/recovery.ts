import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { FastifyInstance } from "fastify";
import {
  observation,
  approvalRequest,
  recoveryDraft,
} from "@aftercare/contracts";
import { sessionOwner } from "./identity.ts";
export async function recoveryRoutes(
  app: FastifyInstance,
  { db }: { db: DatabaseSync },
) {
  const cases =
    "SELECT c.*,o.record FROM recovery_cases c JOIN protection_observations o ON o.id=c.observation_id WHERE o.user_id=?";
  app.addHook("onRequest", async (req, reply) => {
    reply.header("cache-control", "no-store");
    if (!sessionOwner(db, req))
      return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
    if (
      req.method === "POST" &&
      req.headers.origin !==
        (process.env.APP_BASE_URL ?? "http://localhost:3000")
    )
      return reply.code(403).send({ error: { code: "CSRF" } });
  });
  app.get("/", async (req) => ({
    data: db
      .prepare(`${cases} ORDER BY opened_at DESC`)
      .all(sessionOwner(db, req))
      .map((row) => {
        const evidence = observation.parse(JSON.parse(String(row.record)));
        const draft = db
          .prepare(
            "SELECT * FROM recovery_drafts WHERE case_id=? ORDER BY version DESC LIMIT 1",
          )
          .get(row.observation_id);
        const exports = db
          .prepare(
            "SELECT e.* FROM recovery_exports e JOIN recovery_approvals a ON a.id=e.approval_id WHERE a.case_id=? ORDER BY e.created_at DESC",
          )
          .all(row.observation_id);
        return {
          id: row.observation_id,
          state: row.state,
          reason: row.reason,
          evidence,
          draft,
          exports,
          suggestion:
            "Please review my purchase with " +
            evidence.merchant +
            ". " +
            row.reason +
            " My reference is " +
            evidence.source +
            ". Please confirm the applicable next steps.",
        };
      }),
  }));
  app.post<{ Params: { id: string; action: string } }>(
    "/:id/:action",
    { bodyLimit: 16384 },
    async (req, reply) => {
      const { id, action } = req.params;
      const owner = sessionOwner(db, req);
      if (!db.prepare(`${cases} AND c.observation_id=?`).get(owner, id))
        return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      const now = new Date().toISOString();
      db.exec("BEGIN IMMEDIATE");
      try {
        const draft = db
          .prepare(
            "SELECT * FROM recovery_drafts WHERE case_id=? ORDER BY version DESC LIMIT 1",
          )
          .get(id);
        let state = "";
        let data: unknown;
        if (action === "draft") {
          const input = recoveryDraft.parse(req.body);
          const version = Number(draft?.version ?? 0) + 1;
          const hash = createHash("sha256")
            .update(
              JSON.stringify([
                id,
                version,
                "export",
                input.recipient,
                input.body,
              ]),
            )
            .digest("hex");
          db.prepare("INSERT INTO recovery_drafts VALUES(?,?,?,?,?,?)").run(
            id,
            version,
            input.recipient,
            input.body,
            hash,
            now,
          );
          db.prepare(
            "UPDATE recovery_approvals SET revoked_at=? WHERE case_id=? AND consumed_at IS NULL AND revoked_at IS NULL",
          ).run(now, id);
          state = "awaiting_approval";
          data = { version, contentHash: hash };
        } else if (action === "approve") {
          const input = approvalRequest.parse(req.body);
          if (
            !draft ||
            draft.version !== input.version ||
            draft.content_hash !== input.contentHash
          )
            throw Error("STALE");
          const token = randomUUID();
          db.prepare(
            "UPDATE recovery_approvals SET revoked_at=? WHERE case_id=? AND consumed_at IS NULL AND revoked_at IS NULL",
          ).run(now, id);
          db.prepare(
            "INSERT INTO recovery_approvals VALUES(?,?,?,?,?,NULL,NULL)",
          ).run(
            token,
            id,
            draft.version,
            draft.content_hash,
            new Date(Date.now() + 600000).toISOString(),
          );
          state = "approved";
          data = { approvalId: token };
        } else if (action === "export" || action === "revoke") {
          const token = (req.body as { approvalId?: string })?.approvalId;
          if (!draft || typeof token !== "string") throw Error("STALE");
          const field = action === "export" ? "consumed_at" : "revoked_at";
          if (
            !db
              .prepare(
                "UPDATE recovery_approvals SET " +
                  field +
                  "=? WHERE id=? AND case_id=? AND version=? AND content_hash=? AND expires_at>? AND consumed_at IS NULL AND revoked_at IS NULL",
              )
              .run(now, token, id, draft.version, draft.content_hash, now)
              .changes
          )
            throw Error("STALE");
          state =
            action === "export" ? "exported_not_sent" : "awaiting_approval";
          if (action === "export")
            db.prepare("INSERT INTO recovery_exports VALUES(?,?,?,NULL)").run(
              token,
              now,
              new Date(Date.now() + 7 * 86400000).toISOString(),
            );
          data =
            action === "export"
              ? { body: draft.body, recipient: draft.recipient, status: state }
              : { status: state };
        } else {
          db.exec("ROLLBACK");
          return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        }
        db.prepare(
          "UPDATE recovery_cases SET state=? WHERE observation_id=?",
        ).run(state, id);
        db.prepare(
          "INSERT INTO audit_events(user_id,action,subject) VALUES(?,?,?)",
        ).run(owner, `recovery_${state}`, id);
        db.exec("COMMIT");
        return { data };
      } catch (e) {
        db.exec("ROLLBACK");
        if (e instanceof Error && e.message === "STALE")
          return reply.code(409).send({ error: { code: "APPROVAL_INVALID" } });
        if (e instanceof Error && e.name === "ZodError")
          return reply.code(422).send({ error: { code: "INVALID_REQUEST" } });
        throw e;
      }
    },
  );
}
