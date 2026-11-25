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
export const reviewPatch = z.strictObject({
  field: z
    .string()
    .regex(
      /^(merchant|date|currency|orderNumber|notes|items\.(0|[1-9][0-9]?)\.(name|minor))$/,
    ),
  value: z.string().max(4000),
});

const instant = z.iso.datetime({ offset: true });
const minor = z.string().regex(/^\d{1,18}$/);
const evidence = z.strictObject({
  region: z.string().regex(/^[A-Z]{2}$/),
  source: z.url({ protocol: /^https$/ }).max(2048),
  observedAt: instant,
  excerpt: z.string().trim().min(1).max(1500),
  merchant: z.string().trim().min(1).max(200),
});
const timeZone = z
  .string()
  .max(80)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return !!v;
    } catch {
      return false;
    }
  });
const calendar = z.discriminatedUnion("unit", [
  z.strictObject({
    unit: z.literal("date"),
    date: z.iso.date(),
    zone: timeZone,
  }),
  z.strictObject({
    unit: z.enum(["days", "months"]),
    count: z.number().int().min(1).max(1200),
    zone: timeZone,
  }),
]);
export const observation = z.discriminatedUnion("kind", [
  evidence.extend({
    kind: z.literal("return"),
    calendar: calendar.optional(),
    start: instant,
    days: z.number().int().min(1).max(730),
    expiresAt: instant,
  }),
  evidence.extend({
    kind: z.literal("warranty"),
    calendar: calendar.optional(),
    start: instant,
    days: z.number().int().min(1).max(36500),
    expiresAt: instant,
  }),
  evidence.extend({
    kind: z.literal("delivery"),
    dueAt: instant,
    received: z.boolean(),
  }),
  evidence.extend({
    kind: z.literal("refund"),
    dueAt: instant,
    amountMinor: minor,
    currency: z.string().regex(/^[A-Z]{3}$/),
    received: z.boolean(),
  }),
  evidence.extend({
    kind: z.literal("price"),
    paidMinor: minor,
    offerMinor: minor,
    currency: z.string().regex(/^[A-Z]{3}$/),
    sameSku: z.boolean(),
    sameCondition: z.boolean(),
    sameSeller: z.boolean(),
    policySource: z.url({ protocol: /^https$/ }),
    expiresAt: instant,
  }),
  evidence.extend({
    kind: z.literal("recall"),
    brand: z.string().min(1),
    model: z.string().min(1),
    noticeBrand: z.string().min(1),
    noticeModel: z.string().min(1),
  }),
]);
export type Observation = z.infer<typeof observation>;
export const researchRequest = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.enum(["policy", "price"]),
    region: z.string().regex(/^[A-Z]{2}$/),
    domain: z
      .string()
      .max(253)
      .regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i),
  }),
  z.strictObject({
    kind: z.literal("recall"),
    region: z.literal("US"),
    brand: z.string().trim().min(1).max(200),
    model: z.string().trim().min(1).max(200),
    serial: z.string().trim().max(100).optional(),
  }),
]);
export const recoveryDraft = z.strictObject({
  recipient: z.string().trim().min(1).max(200),
  attachments: z.array(z.uuid()).max(4).default([]),
  redact: z.string().max(200).default(""),
  body: z.string().trim().min(1).max(8000),
});
export const approvalRequest = z.strictObject({
  version: z.number().int().positive(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
});
export const monitoringPreferences = z.strictObject({
  paused: z.boolean(),
  reminders: z.boolean(),
});
export const deleteAccount = credentials.extend({
  confirmation: z.literal("DELETE"),
});
export const caseUpdate = z.strictObject({
  status: z.enum(["awaiting_owner", "awaiting_merchant", "resolved_by_owner"]),
  note: z.string().trim().min(1).max(2000),
});
