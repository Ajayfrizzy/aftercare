import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../packages/domain/protection.ts";
import { observation } from "../packages/contracts/index.ts";
import {
  recallNotices,
  researchPolicy,
} from "../packages/connectors/protection.ts";
import { createApp } from "../apps/api/app.ts";
const basic = {
  region: "US",
  source: "https://example.org/policy",
  observedAt: "2026-11-01T12:00:00Z",
  excerpt: "Owner supplied example",
  merchant: "Shop",
};
const purchase = { merchant: "Shop", currency: "USD" };
const now = Date.parse("2026-11-24T00:00:00Z");
const window = {
  start: basic.observedAt,
  days: 30,
  expiresAt: "2027-01-01T00:00:00Z",
};
for (const [fields, state] of [
  [{ kind: "return", ...window }, "monitoring"],
  [{ kind: "warranty", ...window, days: 1 }, "closed"],
  [
    {
      kind: "refund",
      amountMinor: "200",
      currency: "USD",
      dueAt: basic.observedAt,
      received: false,
    },
    "attention",
  ],
  [{ kind: "delivery", dueAt: basic.observedAt, received: true }, "closed"],
  [
    {
      kind: "price",
      paidMinor: "9007199254740993",
      offerMinor: "9007199254740992",
      currency: "USD",
      sameSku: true,
      sameSeller: true,
      sameCondition: true,
      policySource: basic.source,
      expiresAt: window.expiresAt,
    },
    "attention",
  ],
  [
    {
      kind: "recall",
      source: "https://www.cpsc.gov/Recalls/2026/example",
      brand: "A",
      model: "B",
      noticeBrand: "a",
      noticeModel: "b",
    },
    "attention",
  ],
] as const)
  test(`${fields.kind} local rule`, () => {
    const input = observation.parse({ ...basic, ...fields });
    assert.equal(evaluate(input, purchase, now).state, state);
    assert.equal(
      evaluate(input, { ...purchase, merchant: "Other" }, now).state,
      "unknown",
    );
  });

test("connector contract uses granted gateway, primary-domain extract and no credential", async () => {
  const paths: string[] = [];
  const records = await researchPolicy(
    new URL("https://gateway.invalid/grant/"),
    "example.org",
    "US",
    async (url, init) => {
      paths.push(new URL(String(url)).pathname);
      assert.equal(new Headers(init?.headers).has("Authorization"), false);
      return Response.json({
        results:
          paths.length === 1
            ? [
                { url: basic.source },
                { url: "https://example.org/reseller" },
                { url: "https://other.example/p" },
              ]
            : [
                { url: basic.source, raw_content: "Sample return policy" },
                {
                  url: basic.source,
                  raw_content: "Returns under the reseller agreement",
                },
                { url: basic.source, raw_content: "Store opening hours" },
              ],
      });
    },
  );
  assert.deepEqual(paths, ["/grant/search", "/grant/extract"]);
  assert.equal(records.length, 1);
  const notices = await recallNotices("A", "M", async () =>
    Response.json([
      {
        URL: "https://www.cpsc.gov/Recalls/2026/example",
        Products: [{ Model: "M" }],
        Manufacturers: [{ Name: "A" }],
        RecallDate: "2026-01-01",
        Title: "Fixture",
      },
    ]),
  );
  assert.equal(notices.length, 1);
});
test("owner evidence is idempotent and foreign records are masked", async (t) => {
  const app = createApp(":memory:", "x".repeat(32));
  t.after(() => app.close());
  const origin = "http://localhost:3000";
  async function account(email: string) {
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { origin },
      payload: { email, password: "synthetic secret" },
    });
    return { origin, cookie: String(r.headers["set-cookie"]).split(";")[0] };
  }
  const headers = await account("a@example.org"),
    other = await account("b@example.org");
  const p = await app.inject({
    method: "POST",
    url: "/api/v1/purchases",
    headers,
    payload: {
      ...purchase,
      date: "2026-11-01",
      items: [{ name: "Test", minor: "200" }],
    },
  });
  const url = `/api/v1/purchases/${p.json().data.id}/protection`;
  const input = {
    method: "POST" as const,
    url,
    headers,
    payload: {
      ...basic,
      kind: "delivery",
      received: false,
      dueAt: basic.observedAt,
    },
  };
  assert.equal(
    (await app.inject({ ...input, headers: other })).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        ...input,
        headers: { ...headers, origin: "https://other.invalid" },
      })
    ).statusCode,
    403,
  );
  assert.equal((await app.inject(input)).statusCode, 201);
  assert.equal((await app.inject(input)).statusCode, 200);
  assert.equal((await app.inject({ url, headers })).json().data.length, 1);
});
for (const [label, start, calendar, end] of [
  [
    "spring DST",
    "2026-03-07T17:00:00Z",
    { unit: "days", count: 1, zone: "America/New_York" },
    "2026-03-08T16:00:00.000Z",
  ],
  [
    "month end",
    "2026-01-31T12:00:00Z",
    { unit: "months", count: 1, zone: "UTC" },
    "2026-02-28T12:00:00.000Z",
  ],
  [
    "inclusive date",
    "2026-11-01T00:00:00Z",
    { unit: "date", date: "2026-11-23", zone: "Africa/Lagos" },
    "2026-11-23T23:00:00.000Z",
  ],
] as const)
  test(label, () => {
    const input = observation.parse({
      ...basic,
      ...window,
      observedAt: start,
      start,
      kind: "return",
      calendar,
    });
    const before = evaluate(input, purchase, Date.parse(end) - 1);
    assert.equal(before.nextCheckAt, end);
    assert.equal(evaluate(input, purchase, Date.parse(end)).state, "closed");
  });

test("research gate and durable read-triggered check survive retries and reopen", async (t) => {
  const { mkdtempSync, rmSync } = await import("node:fs"),
    { join } = await import("node:path"),
    { tmpdir } = await import("node:os");
  const { openDatabase } = await import("../packages/db/index.ts");
  const dir = mkdtempSync(join(tmpdir(), "aftercare-m2-"));
  t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, "vault.sqlite"),
    app = createApp(path, "x".repeat(32));
  t.after(() => app.close());
  const origin = "http://localhost:3000";
  const user = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin },
    payload: {
      email: "checks@example.org",
      password: "synthetic local password",
    },
  });
  const headers = {
    origin,
    cookie: String(user.headers["set-cookie"]).split(";")[0],
  };
  const p = await app.inject({
    method: "POST",
    url: "/api/v1/purchases",
    headers,
    payload: {
      ...purchase,
      date: "2026-01-01",
      items: [{ name: "Pen", minor: "100" }],
    },
  });
  const base = `/api/v1/purchases/${p.json().data.id}`;
  const research = {
    method: "POST" as const,
    url: `${base}/research`,
    headers,
    payload: { kind: "policy", domain: "example.org", region: "US" },
  };
  assert.equal((await app.inject(research)).statusCode, 503);
  assert.equal(
    (await app.inject({ ...research, headers: { origin } })).statusCode,
    401,
  );
  const db = openDatabase(path);
  t.after(() => db.close());
  db.exec(
    "CREATE TRIGGER fail_check BEFORE INSERT ON protection_checks BEGIN SELECT RAISE(ABORT,'interrupted'); END",
  );
  const action = {
    method: "POST" as const,
    url: `${base}/protection`,
    headers,
    payload: {
      ...basic,
      observedAt: "2020-01-01T00:00:00Z",
      kind: "delivery",
      received: false,
      dueAt: "2099-01-01T00:00:00Z",
    },
  };
  assert.equal((await app.inject(action)).statusCode, 500);
  assert.equal(
    db.prepare("SELECT count(*) AS n FROM protection_observations").get()?.n,
    0,
  );
  db.exec("DROP TRIGGER fail_check");
  assert.equal((await app.inject(action)).statusCode, 201);
  assert.equal((await app.inject(action)).statusCode, 200);
  db.exec("UPDATE protection_checks SET next_at='2020-01-01T00:00:00.000Z'");
  await app.inject({ url: action.url, headers });
  const stamp = db
    .prepare("SELECT last_checked_at FROM protection_checks")
    .get()?.last_checked_at;
  assert.equal(typeof stamp, "string");
  await app.inject({ url: action.url, headers });
  const reopened = openDatabase(path);
  try {
    assert.equal(
      reopened.prepare("SELECT last_checked_at FROM protection_checks").get()
        ?.last_checked_at,
      stamp,
    );
  } finally {
    reopened.close();
  }
});

test("expired recovery lease resumes and an approved export is single-use", async (t) => {
  const { mkdtempSync, rmSync } = await import("node:fs"),
    { join } = await import("node:path"),
    { tmpdir } = await import("node:os");
  const { openDatabase } = await import("../packages/db/index.ts"),
    { claimDue, checkDue } = await import("../packages/agent/recovery.ts");
  const dir = mkdtempSync(join(tmpdir(), "aftercare-recovery-"));
  t.after(() => rmSync(dir, { recursive: true }));
  const previousRoot = process.env.PRIVATE_UPLOAD_DIR;
  process.env.PRIVATE_UPLOAD_DIR = dir;
  t.after(() => {
    if (previousRoot === undefined) delete process.env.PRIVATE_UPLOAD_DIR;
    else process.env.PRIVATE_UPLOAD_DIR = previousRoot;
  });
  const path = join(dir, "db");
  const app = createApp(path, "x".repeat(32));
  t.after(() => app.close());
  const origin = "http://localhost:3000";
  const user = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin },
    payload: { email: "case@example.org", password: "synthetic case password" },
  });
  const headers = {
    origin,
    cookie: String(user.headers["set-cookie"]).split(";")[0],
  };
  const post = (url: string, payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url, headers, payload });
  const foreign = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    headers: { origin },
    payload: {
      email: "foreign@example.org",
      password: "synthetic second password",
    },
  });
  const otherHeaders = {
    origin,
    cookie: String(foreign.headers["set-cookie"]).split(";")[0],
  };
  const original =
    "Receipt for synthetic book order EUR 12.45 https://shop.example";
  async function upload(h: typeof headers) {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/artifacts/upload",
      headers: {
        ...h,
        "content-type": "multipart/form-data; boundary=testfile",
      },
      payload:
        '--testfile\r\nContent-Disposition: form-data; name="file"; filename="receipt.txt"\r\nContent-Type: text/plain\r\n\r\n' +
        original +
        "\r\n--testfile--\r\n",
    });
    assert.equal(res.statusCode, 201);
    return res.json().data.id;
  }
  const account = process.env.AFTERCARE_CF_ACCOUNT,
    priorAiToken = process.env.AFTERCARE_CF_AI_TOKEN;
  process.env.AFTERCARE_CF_ACCOUNT = "a".repeat(32);
  process.env.AFTERCARE_CF_AI_TOKEN = "local-test-only";
  t.after(() => {
    if (account === undefined) delete process.env.AFTERCARE_CF_ACCOUNT;
    else process.env.AFTERCARE_CF_ACCOUNT = account;
    if (priorAiToken === undefined) delete process.env.AFTERCARE_CF_AI_TOKEN;
    else process.env.AFTERCARE_CF_AI_TOKEN = priorAiToken;
  });
  t.mock.method(globalThis, "fetch", async (url: string) =>
    Response.json(
      url.endsWith("/subscriptions")
        ? { success: true, result: [] }
        : {
            result: {
              response: {
                merchantWebsite: "https://shop.example",
                items: [{ name: "Book", minor: 12 }],
              },
            },
          },
    ),
  );
  const prefs = await app.inject({
    method: "PATCH",
    url: "/api/v1/me/preferences",
    headers,
    payload: {
      locale: "en",
      currency: "EUR",
      timezone: "UTC",
      researchConsent: false,
      extractionConsent: true,
    },
  });
  assert.equal(prefs.statusCode, 200);
  const attachment = await upload(headers),
    foreignAttachment = await upload(otherHeaders);
  const review = `/api/v1/artifacts/${attachment}/review`;
  const candidates = (await app.inject({ url: review, headers })).json().data;
  assert.ok(
    candidates.some(
      (r: { field: string; value: string; status: string; source: string }) =>
        r.field === "items.0.minor" &&
        r.value === "12" &&
        r.status === "model_candidate" &&
        r.source.startsWith("Workers AI"),
    ),
  );
  assert.ok(
    candidates.some(
      (r: { field: string; value: string }) =>
        r.field === "merchantWebsite" && r.value === "https://shop.example",
    ),
  );
  assert.equal(
    (await post(review, { field: "items.0.minor", value: "1245" })).statusCode,
    200,
  );
  const p = await post(`/api/v1/extractions/${attachment}/confirm`, {
    ...purchase,
    date: "2020-01-01",
    merchantWebsite: "https://shop.example",
    currency: "EUR",
    items: [{ name: "Book", minor: "1245" }],
  });
  const history = (await app.inject({ url: review, headers })).json().data;
  assert.deepEqual(
    history
      .filter((r: { field: string }) => r.field === "items.0.minor")
      .map((r: { value: string; status: string }) => [r.value, r.status]),
    [
      ["12", "model_candidate"],
      ["1245", "provisional"],
      ["1245", "confirmed"],
    ],
  );
  const obs = await post(`/api/v1/purchases/${p.json().data.id}/protection`, {
    ...basic,
    observedAt: "2020-01-01T00:00:00Z",
    kind: "delivery",
    dueAt: "2020-01-02T00:00:00Z",
    received: false,
  });
  const now = Date.now() + 100;
  const first = openDatabase(path);
  assert.ok(claimDue(first, now));
  first.close();
  const db = openDatabase(path);
  t.after(() => db.close());
  assert.equal(checkDue(db, now + 1), false);
  assert.equal(checkDue(db, now + 31000), true);
  const base = `/api/v1/cases/${obs.json().data.id}`;
  const draft = (
    await post(`${base}/draft`, {
      recipient: "Shop",
      body: "Please review this delivery.",
    })
  ).json().data;
  const old = (await post(`${base}/approve`, draft)).json().data;
  const payload = {
    recipient: "Shop",
    body: "Review PRIVATE and PRIVATE.",
    redact: "PRIVATE",
  };
  assert.equal(
    (
      await post(`${base}/draft`, {
        ...payload,
        attachments: [foreignAttachment],
      })
    ).statusCode,
    409,
  );
  const revised = (
    await post(`${base}/draft`, { ...payload, attachments: [attachment] })
  ).json().data;
  assert.equal((await post(`${base}/export`, old)).statusCode, 409);
  const token = (await post(`${base}/approve`, revised)).json().data;
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(dir, attachment), "Modified contents");
  assert.equal((await post(`${base}/export`, token)).statusCode, 409);
  writeFileSync(join(dir, attachment), original);
  const exported = (await post(`${base}/export`, token)).json().data;
  assert.equal(
    Buffer.from(exported.attachments[0].base64, "base64").toString(),
    original,
  );
  assert.equal(exported.body, "Review [redacted] and [redacted].");
  assert.equal(exported.status, "exported_not_sent");
  assert.equal((await post(`${base}/export`, token)).statusCode, 409);
  assert.equal(
    db.prepare("SELECT count(*) AS n FROM recovery_exports").get()?.n,
    1,
  );
  const { notifyDue } = await import("../packages/agent/recovery.ts");
  const get = (url: string) => app.inject({ url, headers });
  const inbox = "/api/v1/cases/find?mode=reminders";
  const notices = (await get(inbox)).json().data;
  assert.ok(notices.length >= 4);
  assert.equal(
    new Set(notices.map((n: { id: string }) => n.id)).size,
    notices.length,
  );
  const mark = { id: notices[0].id, seen: true };
  assert.equal(
    (await post("/api/v1/cases/notification-read", mark)).statusCode,
    204,
  );
  assert.equal((await get(inbox)).json().data[0].seen, 1);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/cases/notification-read",
        headers: otherHeaders,
        payload: mark,
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (await post("/api/v1/cases/notification-read", { ...mark, seen: false }))
      .statusCode,
    204,
  );
  assert.ok(
    (await get("/api/v1/cases/find?q=exported"))
      .json()
      .data.some((h: { href: string }) =>
        h.href.startsWith("/activity#event-"),
      ),
  );
  const later = now + 8 * 86400000;
  assert.equal(notifyDue(db, later), 1);
  assert.equal(notifyDue(db, later), 0);
  for (const format of ["pdf", "eml"]) {
    const permit = (await post(`${base}/approve`, revised)).json().data;
    const response = await post(`${base}/export`, { ...permit, format });
    assert.equal(response.statusCode, 200);
    assert.equal((await post(`${base}/export`, permit)).statusCode, 409);
    if (format === "pdf") {
      const {
        PDFDocument,
        PDFDict,
        PDFName,
        PDFArray,
        PDFRawStream,
        decodePDFRawStream,
      } = await import("pdf-lib");
      const pdf = await PDFDocument.load(response.rawPayload);
      assert.ok(pdf.getPageCount() > 0);
      const names = pdf.catalog
        .lookup(PDFName.of("Names"), PDFDict)
        .lookup(PDFName.of("EmbeddedFiles"), PDFDict)
        .lookup(PDFName.of("Names"), PDFArray);
      const stream = names
        .lookup(1, PDFDict)
        .lookup(PDFName.of("EF"), PDFDict)
        .lookup(PDFName.of("F"));
      assert.ok(stream instanceof PDFRawStream);
      assert.equal(
        Buffer.from(decodePDFRawStream(stream).decode()).toString(),
        original,
      );
    } else {
      const { execFileSync } = await import("node:child_process");
      const parsed = JSON.parse(
        execFileSync(
          "python3",
          [
            "-c",
            "import email,email.policy,sys,json; m=email.message_from_bytes(sys.stdin.buffer.read(),policy=email.policy.default); print(json.dumps([m.get_body().get_content(),next(m.iter_attachments()).get_payload(decode=True).decode()]))",
          ],
          { input: response.rawPayload, encoding: "utf8" },
        ),
      );
      assert.ok(parsed[0].includes(exported.body));
      assert.equal(parsed[1], original);
    }
  }
  db.prepare("UPDATE protection_observations SET record='{}' WHERE id=?").run(
    obs.json().data.id,
  );
  db.prepare("UPDATE recovery_jobs SET due_at=?,completed_at=NULL").run(
    new Date(now).toISOString(),
  );
  for (let i = 0; i < 5; i++)
    assert.throws(() => checkDue(db, later + i * 90000));
  assert.equal(checkDue(db, later + 999999), false);
  assert.equal(
    db.prepare("SELECT failures FROM recovery_jobs").get()?.failures,
    5,
  );
});
