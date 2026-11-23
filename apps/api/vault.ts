import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { FastifyInstance } from "fastify";
import { purchaseInput } from "@aftercare/contracts";
import { sessionOwner } from "./identity.ts";

export async function vaultRoutes(
  app: FastifyInstance,
  { db }: { db: DatabaseSync },
) {
  app.addHook("preHandler", async (req, reply) => {
    reply.header("cache-control", "no-store");
    if (!sessionOwner(db, req))
      return reply.code(401).send({ error: { code: "UNAUTHORIZED" } });
    if (
      req.method !== "GET" &&
      req.headers.origin !==
        (process.env.APP_BASE_URL ?? "http://localhost:3000")
    )
      return reply.code(403).send({ error: { code: "CSRF" } });
  });
  app.get<{ Querystring: { q?: string; archived?: string } }>(
    "/",
    async (req, reply) => {
      const { q = "", archived = "false" } = req.query;
      if (
        typeof q !== "string" ||
        q.length > 200 ||
        !["true", "false"].includes(archived)
      )
        return reply.code(422).send({ error: { code: "INVALID_FILTER" } });
      const records = db
        .prepare(
          "SELECT id,record FROM purchases WHERE user_id=? AND json_extract(record,'$.archived')=? AND instr(lower(record),lower(?))>0 ORDER BY created_at DESC,id DESC LIMIT 100",
        )
        .all(sessionOwner(db, req), Number(archived === "true"), q);
      return {
        data: records.map((row) => ({
          id: row.id,
          ...JSON.parse(String(row.record)),
        })),
      };
    },
  );
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const row = db
      .prepare("SELECT record FROM purchases WHERE user_id=? AND id=?")
      .get(sessionOwner(db, req), req.params.id);
    return row
      ? { data: { id: req.params.id, ...JSON.parse(String(row.record)) } }
      : reply.code(404).send({ error: { code: "NOT_FOUND" } });
  });
  for (const method of ["POST", "PATCH"] as const) {
    app.route<{ Params: { id?: string } }>({
      method,
      url: method === "POST" ? "/" : "/:id",
      handler: async (req, reply) => {
        const parsed = purchaseInput.safeParse(req.body);
        if (!parsed.success)
          return reply.code(422).send({ error: { code: "INVALID_PURCHASE" } });
        const id = req.params.id ?? randomUUID();
        const owner = sessionOwner(db, req);
        const data = JSON.stringify(parsed.data);
        try {
          const result =
            method === "POST"
              ? db
                  .prepare(
                    "INSERT INTO purchases(id,user_id,record) VALUES(?,?,?)",
                  )
                  .run(id, owner, data)
              : db
                  .prepare(
                    "UPDATE purchases SET record=? WHERE user_id=? AND id=?",
                  )
                  .run(data, owner, id);
          if (!result.changes)
            return reply.code(404).send({ error: { code: "NOT_FOUND" } });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          )
            return reply
              .code(409)
              .send({ error: { code: "DUPLICATE_PURCHASE" } });
          throw error;
        }
        return reply
          .code(method === "POST" ? 201 : 200)
          .send({ data: { id, ...parsed.data } });
      },
    });
  }
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const result = db
      .prepare("DELETE FROM purchases WHERE user_id=? AND id=?")
      .run(sessionOwner(db, req), req.params.id);
    return result.changes
      ? reply.code(204).send()
      : reply.code(404).send({ error: { code: "NOT_FOUND" } });
  });
}
