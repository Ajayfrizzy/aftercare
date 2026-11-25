import { test } from "./api-fixture.ts";
import { expect, type Page } from "@playwright/test";
async function reviewLayouts(page: Page, screen: string, original: number) {
  if (original !== 1440) return;
  for (const width of [390, 768, 1440]) {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      await page.screenshot({
        path: `test-results/design/${screen}-${width}-${colorScheme}.png`,
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
}
for (const width of [390, 1440]) {
  test(`receipt review and owner isolation ${width}`, async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({
      colorScheme: width === 390 ? "dark" : "light",
    });
    await page.goto("/vault");
    await page.getByRole("button", { name: "Create an account" }).click();
    await page.getByLabel("Email").fill(`owner${width}@example.org`);
    await page.getByLabel("Password").fill("synthetic pass phrase");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.getByLabel("Import receipt").setInputFiles({
      name: "receipt.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Example books, Field journal, USD 14.00"),
    });
    await page.getByLabel("Merchant", { exact: true }).fill("Unconfirmed shop");
    await page.getByLabel("Merchant", { exact: true }).press("Tab");
    await page.getByLabel("Merchant", { exact: true }).fill("Example books");
    await page.getByLabel("Purchase date").fill("2026-11-23");
    await page.getByLabel("Item", { exact: true }).fill("Field journal");
    await page.getByLabel("Price in minor units").fill("1400");
    await page.getByLabel("Tags (comma separated)").fill("gift");
    await reviewLayouts(page, "review", width);
    await page.screenshot({
      path: `test-results/design/m1-review-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(
      page.getByRole("heading", { name: "Example books" }),
    ).toBeVisible();
    await reviewLayouts(page, "vault", width);
    await page.screenshot({
      path: `test-results/design/m1-vault-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Edit Example books" }).click();
    await expect(page.getByLabel("Tags (comma separated)")).toHaveValue("gift");
    await page.getByLabel("Tags (comma separated)").fill("stationery");
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(
      page.getByRole("heading", { name: "Example books" }),
    ).toBeVisible();
    await page.reload();
    const search = page.getByLabel("Search purchases");
    await search.fill("gift");
    await expect(
      page.getByText("No purchases match your search."),
    ).toBeVisible();
    await search.fill("stationery");
    await page.getByText("Purchase details", { exact: true }).click();
    const attach = page.getByLabel("Add original receipt");
    await attach.setInputFiles({
      name: "bad.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("incorrect type"),
    });
    await expect(page.getByText(/Upload failed/)).toBeVisible();
    const extra = {
      name: "second.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Supplemental original"),
    };
    await attach.setInputFiles(extra);
    await expect(page.getByText("Original receipt added.")).toBeVisible();
    await attach.setInputFiles(extra);
    await expect(
      page.getByText("Receipt already linked to this purchase."),
    ).toBeVisible();
    await page.reload();
    await page.getByText("Purchase details", { exact: true }).click();
    const sources = page.getByRole("link", { name: "View source receipt" });
    await expect(sources).toHaveCount(2);
    const privatePaths = await sources.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")!),
    );
    const [{ id }] = await page.evaluate(
      async () => (await (await fetch("/api/v1/purchases")).json()).data,
    );
    const foreign = await browser.newContext({ baseURL });
    const second = await foreign.newPage();
    await second.goto("/vault");
    const statuses = await second.evaluate(
      async ({ id, width }) => {
        const register = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: `other${width}@example.org`,
            password: "synthetic pass phrase",
          }),
        });
        const path = `/api/v1/purchases/${id}`;
        return [
          register.status,
          (await fetch(path)).status,
          (await fetch(path, { method: "DELETE" })).status,
        ];
      },
      { id, width },
    );
    expect(statuses).toEqual([201, 404, 404]);
    for (const path of privatePaths)
      expect(
        await second.evaluate(async (url) => (await fetch(url)).status, path),
      ).toBe(404);
    await foreign.close();
  });
}
for (const width of [390, 1440]) {
  test(`guided manual entry and multi-item correction ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.goto("/vault");
    await page.getByRole("button", { name: "Create an account" }).click();
    await page.getByLabel("Email").fill(`manual${width}@example.org`);
    await page.getByLabel("Password").fill("synthetic manual password");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeVisible();
    await reviewLayouts(page, "onboarding", width);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Save choices" }).click();
    await page.getByRole("button", { name: "Enter purchase manually" }).click();
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(page.getByLabel("Merchant", { exact: true })).toBeFocused();
    await page.getByLabel("Merchant", { exact: true }).fill("Paper shop");
    await page.getByLabel("Purchase date").fill("2026-11-23");
    await page.getByLabel("Item", { exact: true }).fill("Diary");
    await page.getByLabel("Price in minor units").fill("1500");
    await page
      .getByRole("button", { name: "Add item", exact: true })
      .press("Enter");
    await page.getByLabel("Item", { exact: true }).nth(1).fill("Pen");
    await page.getByLabel("Price in minor units").nth(1).fill("200");
    await reviewLayouts(page, "editor", width);
    await page.screenshot({
      path: `test-results/design/m1-editor-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Save purchase" }).click();
    await page.getByRole("button", { name: "Edit Paper shop" }).click();
    await page
      .getByLabel("Notes", { exact: true })
      .fill("Purchase detail ".repeat(100));
    const website = page.getByLabel("Merchant website (optional)");
    await website.fill("some text");
    await website.press("Tab");
    await expect(website).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(website).toBeFocused();
    await page.getByLabel("Merchant website (optional)").fill("github.com");
    await page.getByLabel("Item", { exact: true }).nth(1).fill("Blue pen");
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(page.getByText("Saved to your vault")).toBeVisible();
    await expect(
      page.getByText("Blue pen · 200 minor units (USD)"),
    ).toBeVisible();
    await page.reload();
    await page.getByText("Purchase details", { exact: true }).press("Enter");
    await expect(
      page.getByText("Blue pen · 200 minor units (USD)"),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await reviewLayouts(page, "detail", width);
    await page.screenshot({
      path: `test-results/design/m1-detail-${width}.png`,
      fullPage: true,
    });
  });
}

test("protection form records and reads a delivery commitment", async ({
  page,
  baseURL,
}) => {
  await page.goto("/vault");
  const setup = await page.evaluate(async (origin) => {
    const post = (path: string, body: unknown) =>
      fetch(`${origin}/api/v1/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    await post("auth/register", {
      email: "protection@example.org",
      password: "synthetic-protection",
    });
    return (
      await post("purchases", {
        merchant: "Paper shop",
        date: "2026-11-01",
        currency: "USD",
        items: [{ name: "Pen", minor: "100" }],
      })
    ).status;
  }, baseURL);
  expect(setup).toBe(201);
  await page.reload();
  await page.getByText("Purchase protection", { exact: true }).press("Enter");
  await page.getByLabel("Protection type").selectOption("delivery");
  await page.getByLabel("Country code").fill("US");
  await page.getByLabel("Evidence URL").fill("https://example.org/order");
  await page.getByLabel("Source observed at").fill("2026-11-01T12:00");
  await page
    .getByLabel("Evidence excerpt")
    .fill("Synthetic delivery commitment");
  await page.getByLabel("Expected by").fill("2026-11-02T12:00");
  await page.getByRole("button", { name: "Save evidence" }).click();
  await expect(
    page.getByText("Expected date passed. Receipt is unconfirmed."),
  ).toBeVisible();
  await page
    .getByText("Research policies and recall notices", { exact: true })
    .press("Enter");
  await page.getByLabel("Research region").fill("US");
  await page.getByLabel("Merchant website domain").fill("example.org");
  await page
    .getByRole("button", { name: "Check research availability" })
    .click();
  await expect(
    page.getByText(/External research is pending provider verification/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Protection center" }).click();
  await expect(
    page.getByRole("heading", { name: "Needs attention" }),
  ).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.screenshot({
      path: `test-results/design/m2-protection-${width}.png`,
      fullPage: true,
    });
  }
});

test("review, approve and download an evidence-linked recovery draft", async ({
  page,
}) => {
  await page.goto("/vault");
  const status = await page.evaluate(async () => {
    const post = (path: string, payload: unknown) =>
      fetch(`/api/v1/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    await post("auth/register", {
      email: "recover@example.org",
      password: "synthetic recovery password",
    });
    const p = await post("purchases", {
      merchant: "Recovery shop",
      currency: "USD",
      date: "2020-01-01",
      items: [{ name: "Pen", minor: "200" }],
    });
    return (
      await post(`purchases/${(await p.json()).data.id}/protection`, {
        kind: "delivery",
        merchant: "Recovery shop",
        region: "US",
        source: "https://example.org/order",
        observedAt: "2020-01-01T00:00:00Z",
        excerpt: "Synthetic delivery commitment",
        dueAt: "2020-01-02T00:00:00Z",
        received: false,
      })
    ).status;
  });
  expect(status).toBe(201);
  await expect
    .poll(
      () =>
        page.evaluate(
          async () => (await (await fetch("/api/v1/cases")).json()).data.length,
        ),
      { timeout: 12000 },
    )
    .toBe(1);
  await page.reload();
  await page
    .getByLabel("Filter by protection category")
    .selectOption("delivery");
  await page.getByLabel("Risk status").selectOption("closed");
  await expect(page.getByText("No purchases match your search.")).toBeVisible();
  await page.getByLabel("Risk status").selectOption("attention");
  await page.getByText("Purchase protection", { exact: true }).click();
  await page.getByRole("link", { name: "Open recovery case" }).click();
  await expect(page).toHaveURL(/\/cases#case-/);
  await reviewLayouts(page, "case", 1440);
  await page.getByLabel("Intended recipient").fill("Shop support");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Review saved version 1").press("Enter");
  await reviewLayouts(page, "approval", 1440);
  await page
    .getByRole("button", { name: "Approve this version for download" })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download approved claim" }).click();
  const txt = await download;
  const { readFile } = await import("node:fs/promises");
  const letter = await page.locator(".letter").textContent();
  expect(await readFile((await txt.path())!, "utf8")).toBe(
    "Recipient: Shop support\n\n" + letter,
  );
  expect(txt.suggestedFilename()).toBe("aftercare-claim.txt");
  await page.getByRole("link", { name: "Agent activity" }).click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByText(/exported not sent/)).toBeVisible();
  await reviewLayouts(page, "activity", 1440);
  for (const route of ["overview", "protection", "settings", "approvals"]) {
    await page.goto("/" + route);
    await expect(page.locator("h1")).toBeVisible();
    await reviewLayouts(page, route, 1440);
  }
});

test("privacy export and confirmed account deletion", async ({ page }) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  const email = "privacy@example.invalid",
    password = "synthetic privacy password";
  expect(
    await page.evaluate(
      async (credentials) =>
        (
          await fetch("/api/v1/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(credentials),
          })
        ).status,
      { email, password },
    ),
  ).toBe(201);
  await page.reload();
  await page.getByText("Prepare private export").press("Enter");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download records" }).click();
  expect((await download).suggestedFilename()).toBe("aftercare-records.json");
  await page.getByText("Delete my account", { exact: true }).press("Enter");
  await page.getByLabel("Account email").fill(email);
  await page.getByLabel("Current password").fill(password);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account deleted" }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () => (await fetch("/api/v1/me")).status),
  ).toBe(401);
});

test("receipt queue preserves confirmations through failures, duplicates and cancellation", async ({
  page,
}) => {
  await page.goto("/vault");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email").fill("queue@example.org");
  await page.getByLabel("Password").fill("synthetic queue passphrase");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const receipt = (name: string) => ({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from("Receipt from " + name),
  });
  const first = receipt("first.txt");
  const files = [
    first,
    {
      name: "bad.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0, 1, 2]),
    },
    first,
    receipt("second.txt"),
    receipt("cancel.txt"),
  ];
  await page.getByLabel("Import receipt").setInputFiles(files);
  async function confirm(merchant: string) {
    await page.locator('input[name="merchant"]').fill(merchant);
    await page.getByLabel("Purchase date").fill("2026-11-23");
    await page.getByLabel("Item", { exact: true }).fill("Journal");
    await page.getByLabel("Price in minor units").fill("1200");
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(page.getByRole("heading", { name: merchant })).toBeVisible();
  }
  await confirm("First merchant");
  const next = page.getByRole("button", { name: "Review next receipt" });
  await next.click();
  await expect(page.getByText(/Upload failed/)).toBeVisible();
  await next.click();
  await expect(page.getByText(/already been confirmed/)).toBeVisible();
  await next.click();
  await confirm("Second merchant");
  await page.getByRole("button", { name: "Clear waiting receipts" }).click();
  await expect(next).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "First merchant" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Second merchant" }),
  ).toBeVisible();
  const purchases = await page.evaluate(
    async () => (await (await fetch("/api/v1/purchases")).json()).data,
  );
  expect(purchases).toHaveLength(2);
});

test("journal search and notifications open the owned purchase and retain read state", async ({
  page,
}) => {
  await page.goto("/vault");
  await page.evaluate(async () => {
    async function post(path: string, payload: unknown) {
      const response = await fetch("/api/v1/" + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw Error(path);
    }
    await post("auth/register", {
      email: "journal-find@example.org",
      password: "synthetic journal password",
    });
    await post("purchases", {
      merchant: "Copper Pencil",
      currency: "USD",
      date: "2026-11-23",
      items: [{ name: "Notebook", minor: "750" }],
    });
  });
  await page.reload();
  const open = () =>
    page.getByRole("link", { name: "Search & notifications" }).click();
  await open();
  const field = page.getByLabel("Search your journal");
  await field.fill("nonexistent title");
  await field.press("Enter");
  await expect(page.getByText("No matching records.")).toBeVisible();
  await field.fill("Notebook");
  await field.press("Enter");
  await page.getByRole("link", { name: "Purchase · Copper Pencil" }).click();
  await expect(page).toHaveURL(/#purchase-/);
  await page.reload();
  await open();
  const view = page.getByRole("button", { name: "View notifications" });
  await view.click();
  await page.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect(page.getByText("Read", { exact: true })).toBeVisible();
  await page.reload();
  await open();
  await view.click();
  await page.getByRole("button", { name: "Mark as unread" }).click();
  await expect(page.getByText("Unread", { exact: true })).toBeVisible();
});

test("delayed search cannot replace a newer failure or recovery", async ({
  page,
}) => {
  await page.goto("/vault");
  await page
    .getByRole("link", { name: "Search & notifications" })
    .press("Enter");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/cases/find?**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q === "slow") await gate;
    await route.fulfill({
      status: q === "failure" ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: q === "slow" ? [{ label: "Old result", href: "/vault" }] : [],
      }),
    });
  });
  const input = page.getByLabel("Search your journal");
  await input.fill("slow");
  await input.press("Enter");
  await expect(page.getByText("Loading…", { exact: true })).toBeVisible();
  await input.fill("failure");
  await input.press("Enter");
  await expect(page.getByText("Search unavailable.")).toBeVisible();
  const completed = page.waitForResponse((r) => r.url().includes("q=slow"));
  release();
  await completed;
  await input.fill("new");
  await input.press("Enter");
  await expect(page.getByText("No matching records.")).toBeVisible();
  await expect(page.getByText("Old result")).toHaveCount(0);
});

test("outstanding refund commitment across sizes and themes", async ({
  page,
}) => {
  await page.goto("/vault");
  await page.evaluate(async () => {
    async function post(path: string, payload: unknown) {
      const r = await fetch("/api/v1/" + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw Error(path + " " + r.status);
      return (await r.json()).data;
    }
    await post("auth/register", {
      email: "refund@example.org",
      password: "synthetic refund password",
    });
    const p = await post("purchases", {
      merchant: "Paper Shop",
      date: "2026-11-01",
      currency: "EUR",
      items: [{ name: "Journal", minor: "1245" }],
    });
    await post(`purchases/${p.id}/protection`, {
      kind: "refund",
      merchant: "Paper Shop",
      region: "IE",
      currency: "EUR",
      amountMinor: "1245",
      dueAt: "2026-11-20T16:00:00Z",
      observedAt: "2026-11-10T12:00:00Z",
      source: "https://example.org/promise",
      excerpt: "Refund promised for journal",
      received: false,
    });
  });
  await page.goto("/overview");
  for (const width of [390, 768, 1440])
    for (const colorScheme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      const source = page.getByRole("link", {
        name: "Refund source for Paper Shop",
      });
      await expect(source).toHaveAttribute(
        "href",
        "https://example.org/promise",
      );
      const row = source.locator("..");
      await expect(row).toContainText(
        "1245 minor units (EUR) · receipt unconfirmed",
      );
      await expect(row.locator("time")).toHaveAttribute(
        "datetime",
        "2026-11-20T16:00:00Z",
      );
      await source.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(source).toBeFocused();
      await expect(source).toHaveCSS("outline-style", "solid");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      await page.screenshot({
        path: `test-results/design/refund-${width}-${colorScheme}.png`,
        fullPage: true,
      });
    }
  await page.goto("/vault");
  await page.getByText("Purchase protection", { exact: true }).click();
  await page.getByLabel("New refund status").selectOption("processing");
  await page
    .getByLabel("Update evidence URL")
    .fill("https://example.org/processing");
  await page.getByLabel("What changed?").fill("Merchant confirms processing");
  await page.getByRole("button", { name: "Update refund" }).click();
  await expect(page.getByText("Refund updated.")).toBeVisible();
  await page.reload();
  await page.getByText("Purchase protection", { exact: true }).click();
  await expect(page.getByText("Refund status · processing")).toBeVisible();
  await page.getByText("Refund revision history").click();
  await expect(
    page.getByRole("link", { name: "Prior refund source" }),
  ).toHaveAttribute("href", "https://example.org/promise");
  await expect(page.getByText("Refund promised for journal")).toBeVisible();
});
