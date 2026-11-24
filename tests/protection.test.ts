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
            ? [{ url: basic.source }, { url: "https://other.example/p" }]
            : [{ url: basic.source, raw_content: "Sample policy" }],
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
