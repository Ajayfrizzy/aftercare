import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
process.env.M0_PASSWORD ??= randomBytes(32).toString("hex");
process.env.M0_FAULT_FILE ??= `/tmp/aftercare-${randomBytes(12).toString("hex")}`;
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: { channel: "chrome", baseURL: "http://127.0.0.1:3100" },
  webServer: [
    {
      command: "node tests/browser/api-fixture.ts",
      port: 3101,
      env: { SQLITE_PATH: ":memory:", DEMO_SECRET: process.env.M0_PASSWORD },
    },
    {
      command:
        "pnpm --filter @aftercare/web start --hostname 127.0.0.1 --port 3100",
      port: 3100,
    },
  ],
});
