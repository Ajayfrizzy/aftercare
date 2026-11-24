import { createApp } from "./app.ts";
const app = createApp(
  process.env.SQLITE_PATH ?? "aftercare.sqlite",
  process.env.DEMO_SECRET ?? "",
);
await app.listen({
  host: "127.0.0.1",
  port: Number(process.env.AFTERCARE_API_PORT ?? 3101),
});

if (process.env.AFTERCARE_WAKE_TOKEN) {
  const { openDatabase } = await import("@aftercare/db");
  const { wakeListener } = await import("./wake.ts");
  const db = openDatabase(process.env.SQLITE_PATH ?? "aftercare.sqlite");
  const wake = wakeListener(db, process.env.AFTERCARE_WAKE_TOKEN);
  wake.addHook("onClose", async () => db.close());
  await wake.listen({
    host: "0.0.0.0",
    port: Number(process.env.AFTERCARE_WAKE_PORT ?? 8080),
  });
}
