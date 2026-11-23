import { z } from "zod";

export const overview = z.strictObject({
  title: z.string(),
  monitoringMode: z.literal("on_wake"),
  lastCheckedAt: z.null(),
});
export const overviewQuery = z.strictObject({});
