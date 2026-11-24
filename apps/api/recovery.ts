import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { FastifyInstance } from "fastify";
import {
  observation,
  approvalRequest,
  monitoringPreferences,
  recoveryDraft,
  caseUpdate,
} from "@aftercare/contracts";
import { sessionOwner } from "./identity.ts";
export async function recoveryRoutes(
  app: FastifyInstance,
  { db }: { db: DatabaseSync },
) {
  const cases =
    "SELECT c.*,o.record FROM recovery_cases c JOIN protection_observations o ON o.id=c.observation_id WHERE o.user_id=?";
  function receipts(caseId: string, owner: string) {
    return db
      .prepare(
        "SELECT a.id,a.sha,a.mime,a.bytes FROM protection_observations o JOIN receipt_evidence e ON e.purchase_id=o.purchase_id AND e.user_id=o.user_id JOIN artifacts a ON a.id=e.artifact_id AND a.user_id=e.user_id WHERE o.id=? AND o.user_id=? ORDER BY a.id",
      )
      .all(caseId, owner);
  }
  function preview(body: string, redact: string) {
    return redact ? body.replaceAll(redact, "[redacted]") : body;
  }
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
  app.route({
    method: ["GET", "POST"],
    url: "/monitoring",
    handler: async (req, reply) => {
      const owner = sessionOwner(db, req);
      if (req.method === "POST") {
        const parsed = monitoringPreferences.safeParse(req.body);
        if (!parsed.success)
          return reply
            .code(422)
            .send({ error: { code: "INVALID_PREFERENCES" } });
        db.prepare(
          "INSERT INTO monitoring_preferences VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET paused=excluded.paused,reminders=excluded.reminders",
        ).run(owner, Number(parsed.data.paused), Number(parsed.data.reminders));
      }
      const row = db
        .prepare(
          "SELECT paused,reminders FROM monitoring_preferences WHERE user_id=?",
        )
        .get(owner);
      return {
        data: {
          paused: Boolean(row?.paused),
          reminders: Boolean(row?.reminders ?? 1),
        },
      };
    },
  });
  app.get<{ Querystring: { q?: string; mode?: string } }>(
    "/find",
    async (req, reply) => {
      const owner = sessionOwner(db, req),
        query = req.query.q;
      if (req.query.mode === "reminders") {
        const rows = db
          .prepare(
            "SELECT n.id,n.label,n.href,n.stamp,r.event_id IS NOT NULL AS seen FROM journal_notifications n LEFT JOIN notification_reads r ON r.user_id=n.user_id AND r.event_id=n.id WHERE n.user_id=? ORDER BY datetime(n.stamp) DESC,n.id DESC LIMIT 100",
          )
          .all(owner);
        return { data: rows };
      }
      if (typeof query !== "string" || !query.trim() || query.length > 120)
        return reply.code(422).send({ error: { code: "INVALID_QUERY" } });
      const rows = db
        .prepare(`SELECT 'Purchase · '||json_extract(record,'$.merchant') AS label,'/vault#purchase-'||id AS href FROM purchases WHERE user_id=? AND instr(lower(record),lower(?))>0
    UNION ALL SELECT 'Protection · '||json_extract(record,'$.kind')||' · '||json_extract(record,'$.merchant'),'/protection#observation-'||id FROM protection_observations WHERE user_id=? AND instr(lower(record),lower(?))>0
    UNION ALL SELECT 'Case · '||c.reason,'/cases#case-'||c.observation_id FROM recovery_cases c JOIN protection_observations o ON o.id=c.observation_id WHERE o.user_id=? AND instr(lower(o.record||c.reason),lower(?))>0
    UNION ALL SELECT 'Agent activity · '||replace(action,'_',' ')||' · '||created_at,'/activity#event-'||sequence FROM audit_events WHERE user_id=? AND action LIKE 'recovery_%' AND instr(lower(replace(action,'_',' ')||' '||subject||' '||created_at),lower(?))>0 ORDER BY label LIMIT 100`)
        .all(owner, query, owner, query, owner, query, owner, query);
      return { data: rows };
    },
  );
  app.post("/notification-read", async (req, reply) => {
    const { id, seen } = (req.body ?? {}) as { id?: unknown; seen?: unknown };
    if (typeof id !== "string" || id.length > 128 || typeof seen !== "boolean")
      return reply.code(422).send();
    const owner = sessionOwner(db, req);
    if (
      !db
        .prepare("SELECT 1 FROM journal_notifications WHERE user_id=? AND id=?")
        .get(owner, id)
    )
      return reply.code(404).send();
    if (seen)
      db.prepare("INSERT OR IGNORE INTO notification_reads VALUES(?,?)").run(
        owner,
        id,
      );
    else
      db.prepare(
        "DELETE FROM notification_reads WHERE user_id=? AND event_id=?",
      ).run(owner, id);
    return reply.code(204).send();
  });
  app.get("/activity", async (req) => {
    const owner = sessionOwner(db, req);
    const events = db
      .prepare(
        "SELECT sequence,action,subject,created_at FROM audit_events WHERE user_id=? AND action LIKE 'recovery_%' ORDER BY sequence DESC LIMIT 100",
      )
      .all(owner);
    const jobs = db
      .prepare(
        "SELECT j.attempts,j.failures,j.failed_at,j.completed_at,j.due_at,j.lease_until,o.id,json_extract(o.record,'$.source') AS source,json_extract(o.record,'$.observedAt') AS observedAt,json_extract(o.record,'$.kind') AS kind,c.reason FROM recovery_jobs j JOIN protection_observations o ON o.id=j.observation_id LEFT JOIN recovery_cases c ON c.observation_id=o.id WHERE o.user_id=? ORDER BY j.id DESC LIMIT 100",
      )
      .all(owner);
    return { data: { events, jobs } };
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
          history: db
            .prepare(
              "SELECT action,created_at FROM audit_events WHERE subject=? AND user_id=? ORDER BY sequence",
            )
            .all(row.observation_id, sessionOwner(db, req)),
          notes: db
            .prepare(
              "SELECT status,note,created_at FROM case_updates WHERE case_id=? ORDER BY id",
            )
            .all(row.observation_id),
          state: row.state,
          reason: row.reason,
          evidence,
          receipts: receipts(
            String(row.observation_id),
            String(sessionOwner(db, req)),
          ),
          draft: draft && {
            ...draft,
            attachments: JSON.parse(String(draft.manifest)),
            preview: preview(String(draft.body), String(draft.redact)),
          },
          activeApproval: draft
            ? (db
                .prepare(
                  "SELECT id,expires_at FROM recovery_approvals WHERE case_id=? AND version=? AND content_hash=? AND expires_at>? AND consumed_at IS NULL AND revoked_at IS NULL ORDER BY expires_at DESC LIMIT 1",
                )
                .get(
                  row.observation_id,
                  draft.version,
                  draft.content_hash,
                  new Date().toISOString(),
                ) ?? null)
            : null,
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
          const allowed = receipts(id, String(owner));
          const selected = allowed.filter((file) =>
            input.attachments.includes(String(file.id)),
          );
          if (
            selected.length !== input.attachments.length ||
            (input.redact && !input.body.includes(input.redact))
          )
            throw Error("STALE");
          const manifest = JSON.stringify(selected);
          const version = Number(draft?.version ?? 0) + 1;
          const hash = createHash("sha256")
            .update(
              JSON.stringify([
                id,
                version,
                "export",
                input.recipient,
                input.body,
                manifest,
                input.redact,
              ]),
            )
            .digest("hex");
          db.prepare(
            "INSERT INTO recovery_drafts(case_id,version,recipient,body,content_hash,created_at,manifest,redact) VALUES(?,?,?,?,?,?,?,?)",
          ).run(
            id,
            version,
            input.recipient,
            input.body,
            hash,
            now,
            manifest,
            input.redact,
          );
          db.prepare(
            "UPDATE recovery_approvals SET revoked_at=? WHERE case_id=? AND consumed_at IS NULL AND revoked_at IS NULL",
          ).run(now, id);
          state = "awaiting_approval";
          data = { version, contentHash: hash };
        } else if (action === "update") {
          const input = caseUpdate.parse(req.body);
          db.prepare(
            "INSERT INTO case_updates(case_id,status,note,created_at) VALUES(?,?,?,?)",
          ).run(id, input.status, input.note, now);
          db.prepare(
            "UPDATE recovery_approvals SET revoked_at=? WHERE case_id=? AND consumed_at IS NULL AND revoked_at IS NULL",
          ).run(now, id);
          state = input.status;
          data = { status: state };
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
          const attachments = [];
          if (action === "export") {
            const current = receipts(id, String(owner));
            for (const file of JSON.parse(String(draft.manifest))) {
              if (
                !current.some(
                  (row) =>
                    row.id === file.id &&
                    row.sha === file.sha &&
                    row.mime === file.mime &&
                    row.bytes === file.bytes,
                )
              )
                throw Error("STALE");
              const bytes = readFileSync(
                join(
                  process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads",
                  file.id,
                ),
              );
              if (createHash("sha256").update(bytes).digest("hex") !== file.sha)
                throw Error("STALE");
              attachments.push({ ...file, base64: bytes.toString("base64") });
            }
          }
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
              ? {
                  body: preview(String(draft.body), String(draft.redact)),
                  recipient: draft.recipient,
                  attachments,
                  status: state,
                }
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
