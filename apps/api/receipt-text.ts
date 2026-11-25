import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

export async function receiptText(path: string, mime: string) {
  if (mime === "text/plain")
    return (await readFile(path, "utf8")).slice(0, 8000);
  if (process.platform !== "darwin")
    throw Error("Local document reader unavailable.");
  const helper = fileURLToPath(
    new URL("./receipt-text.swift", import.meta.url),
  );
  const { stdout } = await promisify(execFile)(
    "/usr/bin/swift",
    [helper, path, mime],
    {
      timeout: 45000,
      maxBuffer: 128000,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PATH: "/usr/bin:/bin",
        HOME: process.env.HOME,
      },
    },
  );
  return stdout.trim().slice(0, 8000);
}

export function printedFields(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fields: Record<string, string> = {};
  const merchant =
    text.match(/^(?:merchant|store|seller)\s*:\s*(.+)$/im)?.[1] ??
    lines.find((line) => !/receipt|invoice|^\d|:/i.test(line));
  if (merchant) fields.merchant = merchant;
  const date = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (date) fields.date = date[0];
  const currency = text.match(/\b(USD|EUR|GBP|NGN|CAD|AUD)\b/i);
  if (currency) fields.currency = currency[1].toUpperCase();
  const order = text.match(
    /(?:order|invoice)\s*(?:number|no\.?|id|#)?\s*[:#]\s*([\w-]+)/i,
  );
  if (order) fields.orderNumber = order[1];
  let index = 0;
  for (const line of lines) {
    if (/\b(total|tax|balance|paid|change|discount)\b/i.test(line)) continue;
    const match = line.match(
      /^(.+?)\s+(?:(?:USD|EUR|GBP|NGN|CAD|AUD)\s*|[$£€₦])?(\d{1,12})[.,](\d{2})$/i,
    );
    if (match && fields.currency && index < 20) {
      fields[`items.${index}.name`] = match[1];
      fields[`items.${index++}.minor`] = BigInt(match[2] + match[3]).toString();
    }
  }
  return Object.entries(fields)
    .filter(([, value]) => value.length <= 160)
    .map(([field, value]) => ({
      field,
      value,
      source: "Local receipt text · suggested",
    }));
}
