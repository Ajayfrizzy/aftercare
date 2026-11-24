import { expect, test, type Page } from "@playwright/test";
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
    await reviewLayouts(page, "review", width);
    await page.screenshot({
      path: `docs/evidence/screens/m1-review-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(
      page.getByRole("heading", { name: "Example books" }),
    ).toBeVisible();
    await reviewLayouts(page, "vault", width);
    await page.screenshot({
      path: `docs/evidence/screens/m1-vault-${width}.png`,
      fullPage: true,
    });
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
      path: `docs/evidence/screens/m1-editor-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Save purchase" }).click();
    await page.getByRole("button", { name: "Edit Paper shop" }).click();
    await page.getByLabel("Item", { exact: true }).nth(1).fill("Blue pen");
    await page.getByRole("button", { name: "Save purchase" }).click();
    await page.getByText("Purchase details", { exact: true }).press("Enter");
    await expect(
      page.getByText("Blue pen · 200 minor units (USD)"),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await reviewLayouts(page, "detail", width);
    await page.screenshot({
      path: `docs/evidence/screens/m1-detail-${width}.png`,
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
      path: `docs/evidence/screens/m2-protection-${width}.png`,
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
  await page.getByLabel("Intended recipient").fill("Shop support");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Review saved version 1").press("Enter");
  await page
    .getByRole("button", { name: "Approve this version for download" })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download approved claim" }).click();
  expect((await download).suggestedFilename()).toBe("aftercare-claim.txt");
  await page.getByRole("link", { name: "Agent activity" }).click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByText(/exported not sent/)).toBeVisible();
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
