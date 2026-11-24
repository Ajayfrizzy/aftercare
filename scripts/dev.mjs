import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const env = {
  ...process.env,
  APP_BASE_URL: "http://127.0.0.1:3000",
  DEMO_SECRET: process.env.DEMO_SECRET ?? randomBytes(32).toString("hex"),
};
const services = [
  spawn(process.execPath, ["server.ts"], { cwd: "apps/api", env, stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3000"], { cwd: "apps/web", env, stdio: "inherit" }),
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
