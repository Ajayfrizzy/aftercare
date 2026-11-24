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
