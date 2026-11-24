import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const previousM2 = process.argv.includes("--m2-data");
const port = previousM2 ? "3120" : "3000";
const env = {
  ...process.env,
  APP_BASE_URL: `http://127.0.0.1:${port}`,
  AFTERCARE_API_PORT: previousM2 ? "3121" : "3101",
  SQLITE_PATH: process.env.SQLITE_PATH ?? (previousM2 ? "aftercare-m2.sqlite" : "aftercare.sqlite"),
  PRIVATE_UPLOAD_DIR:process.env.PRIVATE_UPLOAD_DIR ?? (previousM2 ? "private-uploads-m2" : "private-uploads"),
  DEMO_SECRET: process.env.DEMO_SECRET ?? randomBytes(32).toString("hex"),
};
const services = [
  spawn(process.execPath, ["server.ts"], { cwd: "apps/api", env, stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", port], { cwd: "apps/web", env, stdio: "inherit" }),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of services) child.kill("SIGTERM");
}
for (const child of services) {
  child.on("exit", (code) => stop(code ?? 1));
  child.on("error", (error) => { console.error(error.message); stop(1); });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
