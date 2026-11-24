import { test } from "./api-fixture.ts";
import { expect } from "@playwright/test";

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`landing and private journal at ${width}`, async ({
    browser,
    baseURL,
  }) => {
    const dark = width === 390 || width === 1024;
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 800 },
      colorScheme: dark ? "dark" : "light",
      httpCredentials: {
        username: "demo",
        password: process.env.M0_PASSWORD ?? "",
      },
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your purchases deserve a second look.",
    );
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      dark ? "rgb(13, 24, 33)" : "rgb(247, 249, 248)",
    );
    await page.keyboard.press("Tab");
    const link = page.getByRole("link", { name: "Open private demo" });
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-style", "solid");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: `test-results/design/landing-${width}.png`,
      });
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Your protection journal" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: `test-results/design/journal-${width}.png`,
      });
    if ([390, 768, 1440].includes(width)) {
      for (const colorScheme of ["dark", "light"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.getByRole("button", { name: "Next step" }).first().focus();
        await expect(
          page.getByRole("button", { name: "Next step" }).first(),
        ).toBeFocused();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        await page.goto("/");
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        await page.getByRole("link", { name: "Open private demo" }).click();
      }
    }
    await context.close();
  });
}
test("private document challenges anonymous browsers", async ({ request }) => {
  const response = await request.get("/journal");
  expect(response.status()).toBe(401);
  expect(response.headers()["www-authenticate"]).toContain("Basic");
  expect(await response.text()).not.toContain("Your protection journal");
});

test("slow unavailable journal announces loading and offers keyboard recovery", async ({
  browser,
  baseURL,
}) => {
  const { writeFileSync, unlinkSync } = await import("node:fs");
  const context = await browser.newContext({
    baseURL,
    httpCredentials: {
      username: "demo",
      password: process.env.M0_PASSWORD ?? "",
    },
  });
  const page = await context.newPage();
  await page.goto("/journal");
  await expect(page.getByText("Your protection journal")).toBeVisible();
  const flag = process.env.M0_FAULT_FILE;
  if (!flag) throw new Error("Missing fixture path");
  writeFileSync(flag, "delay");
  try {
    await page.reload({ waitUntil: "commit" });
    await expect(page.getByRole("status")).toContainText("Opening");
    await expect(
      page.getByRole("heading", { name: "Journal unavailable" }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Return home" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${baseURL}/`);
  } finally {
    unlinkSync(flag);
    await context.close();
  }
});
