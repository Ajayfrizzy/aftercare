import { createApp } from "../../apps/api/app.ts";
import { existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { test as base } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const test = base.extend<{ localApi: void }>({
  localApi: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructuring fixture dependencies even when none are used.
    async ({}, use) => {
      const root = mkdtempSync(join(tmpdir(), "aftercare-browser-"));
      process.env.PRIVATE_UPLOAD_DIR = root;
      process.env.APP_BASE_URL = "http://127.0.0.1:3100";
      const app = createApp(":memory:", process.env.M0_PASSWORD ?? "");
      const flag = process.env.M0_FAULT_FILE;
      let calls = 0;
      app.addHook("onRequest", async (_req, reply) => {
        if (flag && existsSync(flag) && ++calls % 2 === 0) {
          await setTimeout(1800);
          return reply.code(503).send();
        }
      });
      await app.listen({
        host: "127.0.0.1",
        port: Number(process.env.AFTERCARE_API_PORT ?? 3101),
      });
      try {
        await use();
      } finally {
        await app.close();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { auto: true },
  ],
});
