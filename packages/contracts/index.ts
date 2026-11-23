import { z } from "zod";

export const overview = z.strictObject({
  title: z.string(),
  monitoringMode: z.literal("on_wake"),
  lastCheckedAt: z.null(),
});
export const overviewQuery = z.strictObject({});

export const credentials = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});
