import { createApp } from "../../apps/api/app.ts";
import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
const app = createApp(":memory:", process.env.DEMO_SECRET ?? "");
const flag = process.env.M0_FAULT_FILE;
let calls = 0;
app.addHook("onRequest", async (_req, reply) => {
  if (flag && existsSync(flag) && ++calls % 2 === 0) {
    await setTimeout(1800);
    return reply.code(503).send();
  }
});
await app.listen({ host: "127.0.0.1", port: 3101 });
