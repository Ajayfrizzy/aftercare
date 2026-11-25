import {
  extractionAvailability,
  receiptCandidates,
} from "../../packages/connectors/extraction.ts";
import multipart from "@fastify/multipart";
import { randomUUID, createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  unlinkSync,
  createReadStream,
} from "node:fs";
import { resolve, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { FastifyInstance } from "fastify";
import { sessionOwner } from "./identity.ts";
import { purchaseInput, reviewPatch } from "@aftercare/contracts";

function detect(bytes: Buffer) {
  if (
    bytes.subarray(0, 5).toString() === "%PDF-" &&
    bytes.subarray(-1024).includes(Buffer.from("%%EOF"))
  )
    return "application/pdf";
  if (
    bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
    bytes.subarray(-8, -4).toString() === "IEND"
  )
    return "image/png";
  if (
    bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) &&
    bytes.subarray(-2).equals(Buffer.from("ffd9", "hex"))
  )
    return "image/jpeg";
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.trim() && !text.includes("\0")) return "text/plain";
  } catch {}
  return null;
}
export async function receiptRoutes(
  app: FastifyInstance,
  { db }: { db: DatabaseSync },
) {
  const root = resolve(process.env.PRIVATE_UPLOAD_DIR ?? "private-uploads");
  app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1, parts: 1 },
  });
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
  app.post("/artifacts/upload", async (req, reply) => {
    const file = await req.file();
    if (!file)
      return reply.code(422).send({ error: { code: "FILE_REQUIRED" } });
    const bytes = await file.toBuffer();
    const mime = detect(bytes);
    if (!mime || mime !== file.mimetype)
      return reply.code(422).send({ error: { code: "INVALID_FILE" } });
    const owner = sessionOwner(db, req),
      sha = createHash("sha256").update(bytes).digest("hex");
    const existing = db
      .prepare("SELECT id FROM artifacts WHERE user_id=? AND sha=?")
      .get(owner, sha);
    if (existing) return { data: { id: existing.id, mime, duplicate: true } };
    const quota = db
      .prepare(
        "SELECT COALESCE(sum(bytes),0) AS total FROM artifacts WHERE user_id=?",
      )
      .get(owner);
    if (Number(quota?.total) + bytes.length > 50 * 1024 * 1024)
      return reply.code(413).send({ error: { code: "QUOTA" } });
    const id = randomUUID();
    mkdirSync(root, { recursive: true, mode: 0o700 });
    writeFileSync(join(root, id), bytes, { flag: "wx", mode: 0o600 });
    try {
      db.prepare(
        "INSERT INTO artifacts(id,user_id,sha,mime,bytes) VALUES(?,?,?,?,?)",
      ).run(id, owner, sha, mime, bytes.length);
    } catch (error) {
      unlinkSync(join(root, id));
      throw error;
    }
    const consent = () =>
      Boolean(
        JSON.parse(
          String(
            db.prepare("SELECT preferences FROM users WHERE id=?").get(owner)
              ?.preferences ?? "{}",
          ),
        ).extractionConsent,
      );
    if (mime === "text/plain" && bytes.length <= 8000 && consent()) {
      const candidates = await receiptCandidates(bytes.toString("utf8")).catch(
        () => [],
      );
      if (candidates.length && consent()) {
        db.exec("BEGIN IMMEDIATE");
        try {
          const save = db.prepare(
            "INSERT INTO review_fields(owner,artifact,field,value,source,status) SELECT ?,?,?,?,?,'model_candidate' WHERE EXISTS(SELECT 1 FROM artifacts WHERE user_id=? AND id=?) AND NOT EXISTS(SELECT 1 FROM review_fields WHERE owner=? AND artifact=? AND field=?) AND NOT EXISTS(SELECT 1 FROM receipt_evidence WHERE user_id=? AND artifact_id=?)",
          );
          for (const c of candidates)
            save.run(
              owner,
              id,
              c.field,
              c.value,
              c.source,
              owner,
              id,
              owner,
              id,
              c.field,
              owner,
              id,
            );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
    }
    return reply.code(201).send({ data: { id, mime, duplicate: false } });
  });
  app.route<{ Params: { id: string } }>({
    method: ["GET", "POST"],
    url: "/artifacts/:id/review",
    handler: async (req, reply) => {
      const owner = sessionOwner(db, req),
        id = req.params.id;
      if (
        !db
          .prepare("SELECT id FROM artifacts WHERE id=? AND user_id=?")
          .get(id, owner)
      )
        return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      if (req.method === "POST") {
        const patch = reviewPatch.safeParse(req.body);
        if (!patch.success)
          return reply.code(422).send({ error: { code: "INVALID_FIELD" } });
        if (
          db
            .prepare(
              "SELECT artifact_id FROM receipt_evidence WHERE artifact_id=?",
            )
            .get(id)
        )
          return reply.code(409).send({ error: { code: "ALREADY_CONFIRMED" } });
        db.prepare(
          "INSERT INTO review_fields(owner,artifact,field,value,source,status) VALUES(?,?,?,?,'user_entry','provisional')",
        ).run(owner, id, patch.data.field, patch.data.value);
      }
      return {
        data: db
          .prepare(
            "SELECT revision,artifact,field,value,source,status,created_at FROM review_fields WHERE owner=? AND artifact=? ORDER BY revision",
          )
          .all(owner, id),
      };
    },
  });
  app.get<{ Params: { id: string } }>(
    "/artifacts/:id/preview",
    async (req, reply) => {
      const file = db
        .prepare("SELECT id,mime FROM artifacts WHERE id=? AND user_id=?")
        .get(req.params.id, sessionOwner(db, req));
      if (!file) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      return reply
        .type(String(file.mime))
        .header("Content-Security-Policy", "sandbox; default-src 'none'")
        .header("X-Content-Type-Options", "nosniff")
        .send(createReadStream(join(root, String(file.id))));
    },
  );
  app.get<{ Params: { id: string } }>(
    "/artifacts/:id/download",
    async (req, reply) => {
      const file = db
        .prepare("SELECT mime,id FROM artifacts WHERE id=? AND user_id=?")
        .get(req.params.id, sessionOwner(db, req));
      if (!file) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      return reply
        .type(String(file.mime))
        .header("x-content-type-options", "nosniff")
        .header("content-disposition", 'attachment; filename="receipt"')
        .send(createReadStream(join(root, String(file.id))));
    },
  );
  app.post<{ Params: { id: string } }>(
    "/artifacts/:id/extract",
    async (req, reply) => {
      const file = db
        .prepare("SELECT id FROM artifacts WHERE id=? AND user_id=?")
        .get(req.params.id, sessionOwner(db, req));
      if (!file) return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      return reply.code(503).send({ error: extractionAvailability() });
    },
  );
  app.post<{ Params: { id: string } }>(
    "/extractions/:id/confirm",
    async (req, reply) => {
      const owner = sessionOwner(db, req);
      if (
        !db
          .prepare("SELECT id FROM artifacts WHERE id=? AND user_id=?")
          .get(req.params.id, owner)
      )
        return reply.code(404).send({ error: { code: "NOT_FOUND" } });
      const input = purchaseInput.safeParse(req.body);
      if (!input.success)
        return reply.code(422).send({ error: { code: "INVALID_PURCHASE" } });
      const id = randomUUID();
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "INSERT INTO purchases(id,user_id,record) VALUES(?,?,?)",
        ).run(id, owner, JSON.stringify(input.data));
        db.prepare(
          "INSERT INTO receipt_evidence(user_id,artifact_id,purchase_id) VALUES(?,?,?)",
        ).run(owner, req.params.id, id);
        const recordField = db.prepare(
          "INSERT INTO review_fields(owner,artifact,field,value,source,status) VALUES(?,?,?,?,'user_review','confirmed')",
        );
        for (const [field, value] of Object.entries(input.data)) {
          if (field === "items") {
            input.data.items.forEach((item, index) => {
              for (const [key, v] of Object.entries(item))
                recordField.run(
                  owner,
                  req.params.id,
                  `items.${index}.${key}`,
                  v,
                );
            });
          } else if (typeof value === "string")
            recordField.run(owner, req.params.id, field, value);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint")
        )
          return reply
            .code(409)
            .send({ error: { code: "DUPLICATE_RECEIPT_OR_ORDER" } });
        throw error;
      }
      return reply.code(201).send({ data: { id, ...input.data } });
    },
  );
}
