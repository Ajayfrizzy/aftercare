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

export const purchaseInput = z.strictObject({
  merchant: z.string().trim().min(1).max(200),
  date: z.iso.date(),
  orderNumber: z.string().trim().max(128).default(""),
  currency: z.string().regex(/^[A-Z]{3}$/),
  items: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1).max(200),
        minor: z.string().regex(/^\d{1,18}$/),
      }),
    )
    .min(1)
    .max(100),
  notes: z.string().max(4000).default(""),
  archived: z.boolean().default(false),
});
export const preferences = z.strictObject({
  locale: z
    .string()
    .min(2)
    .max(35)
    .refine((value) => {
      try {
        return Intl.getCanonicalLocales(value).length === 1;
      } catch {
        return false;
      }
    }),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
  currency: z.string().regex(/^[A-Z]{3}$/),
  researchConsent: z.boolean(),
  extractionConsent: z.boolean(),
});
