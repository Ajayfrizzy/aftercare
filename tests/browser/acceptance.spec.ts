import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { expect } from "@playwright/test";
import { test as base } from "./api-fixture.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const test = base.extend({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires destructured fixture dependencies.
  journalPath: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), "aftercare-acceptance-"));
    try {
      await use(join(dir, "journal.sqlite"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
});

test("disposable owner acceptance journal", async ({ page, journalPath }) => {
  const manual = process.env.AFTERCARE_OWNER_SESSION === "1";
  if (manual) test.setTimeout(0);
  const merchant = "Synthetic · Willow Stationery";
  const source = "https://willow.example.invalid";
  await page.context().route(source + "/**", (route) =>
    route.fulfill({
      contentType: "text/plain",
      body: "Synthetic acceptance evidence. Delivery was promised by January 3, 2020. A USD 12.45 refund was promised, entered processing and was disputed. No settlement is confirmed.",
    }),
  );
  await page.context().route("**/api/v1/purchases/*/research", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "PROVIDER_GATE_PENDING" } },
    }),
  );
  await page.goto("/vault");
  async function request(path: string, data?: unknown) {
    return page.evaluate(
      async ({ path, data }) => {
        const res = await fetch(
          "/api/v1/" + path,
          data === undefined
            ? {}
            : {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(data),
              },
        );
        return { status: res.status, data: (await res.json()).data };
      },
      { path, data },
    );
  }
  async function post(path: string, data: unknown) {
    const res = await request(path, data);
    expect(res.status, path).toBeLessThan(300);
    return res.data;
  }
  await post("auth/register", {
    email: "acceptance@example.invalid",
    password: randomBytes(24).toString("hex"),
  });
  async function upload(text: string) {
    return page.evaluate(async (text) => {
      const form = new FormData();
      form.append(
        "file",
        new File([text], "synthetic.txt", { type: "text/plain" }),
      );
      const res = await fetch("/api/v1/artifacts/upload", {
        method: "POST",
        body: form,
      });
      if (res.status !== 201)
        throw Error("Synthetic upload returned " + res.status);
      return (await res.json()).data.id as string;
    }, text);
  }
  const original = "Synthetic receipt: Willow Stationery, notebook, USD 12.45.";
  const receipt = await upload(original);
  const purchase = await post("extractions/" + receipt + "/confirm", {
    merchant,
    date: "2020-01-01",
    currency: "USD",
    tags: ["synthetic"],
    items: [{ name: "Field notebook", minor: "1245" }],
  });
  const path = "purchases/" + purchase.id;
  const slip = await upload("Synthetic packing slip for the field notebook.");
  await post(path + "/receipts/" + slip, {});
  const facts = {
    merchant,
    region: "US",
    observedAt: "2020-01-02T12:00:00Z",
    dueAt: "2020-01-03T12:00:00Z",
    received: false,
  };
  const delivery = await post(path + "/protection", {
    ...facts,
    kind: "delivery",
    source: source + "/delivery",
    excerpt: "Synthetic delivery commitment missed.",
  });
  const refund = await post(path + "/protection", {
    ...facts,
    kind: "refund",
    source: source + "/refund",
    excerpt: "Synthetic refund promised.",
    currency: "USD",
    amountMinor: "1245",
  });
  for (const [revision, status] of ["processing", "disputed"].entries()) {
    await post(path + "/protection/" + refund.id + "/refund", {
      revision,
      status,
      source: source + "/" + status,
      excerpt: "Synthetic refund update: " + status,
    });
  }
  await expect
    .poll(async () => (await request("cases")).data.length, { timeout: 15000 })
    .toBe(2);
  const draft = {
    recipient: "support@willow.example.invalid",
    body: "Please review the missed synthetic delivery.",
    attachments: [receipt],
  };
  await post("cases/" + delivery.id + "/draft", draft);
  const prior = await post("cases/" + refund.id + "/draft", {
    ...draft,
    body: "Please review the disputed synthetic refund.",
  });
  const approval = await post("cases/" + refund.id + "/approve", prior);
  await post("cases/" + refund.id + "/export", approval);
  // Advance only this fixture's existing follow-up deadline. The real worker delivers it.
  const db = new DatabaseSync(journalPath);
  try {
    expect(
      db
        .prepare(
          "UPDATE recovery_exports SET follow_up_at=? WHERE approval_id=?",
        )
        .run(new Date(Date.now() - 60000).toISOString(), approval.approvalId)
        .changes,
    ).toBe(1);
  } finally {
    db.close();
  }
  await expect
    .poll(
      async () =>
        (await request("cases")).data.some(
          (c: { exports: { notified_at: string | null }[] }) =>
            c.exports.some((x) => x.notified_at),
        ),
      { timeout: 15000 },
    )
    .toBeTruthy();
  await page.goto("/vault");
  await expect(page.getByRole("heading", { name: merchant })).toBeVisible();
  if (manual) {
    await page.pause();
    return;
  }
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Protection deadlines" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Need attention/ }).click();
  await expect(
    page.getByRole("heading", { name: "Needs attention" }),
  ).toBeVisible();
  await page.goto("/approvals#case-" + delivery.id);
  const card = page.locator('[id="case-' + delivery.id + '"]');
  await expect(card.getByText(/Original receipt, including/)).toBeVisible();
  const authorized = page.waitForResponse(
    (r) => r.url().endsWith("/approve") && r.request().method() === "POST",
  );
  await card
    .getByRole("button", { name: "Approve this version for download" })
    .press("Enter");
  const token = (await (await authorized).json()).data;
  const file = page.waitForEvent("download");
  await card.getByRole("button", { name: "Download approved claim" }).click();
  expect((await file).suggestedFilename()).toBe("aftercare-claim.json");
  expect(
    (await request("cases/" + delivery.id + "/export", token)).status,
  ).toBe(409);
  await page.goto("/inbox");
  await page.getByRole("button", { name: "View notifications" }).click();
  await expect(page.getByText(/follow.up/i).first()).toBeVisible();
});
