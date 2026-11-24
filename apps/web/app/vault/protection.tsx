"use client";
import { useState, type FormEvent } from "react";
import type { Observation } from "@aftercare/contracts";
import { Research } from "./research";
type Kind = Observation["kind"];
const names: Record<Kind, string> = {
  return: "Return window",
  warranty: "Warranty",
  price: "Price adjustment",
  recall: "Recall match",
  delivery: "Delivery",
  refund: "Refund",
};
const inputs: Record<Kind, string[]> = {
  return: ["start", "days", "expiresAt"],
  warranty: ["start", "days", "expiresAt"],
  price: [
    "paidMinor",
    "offerMinor",
    "sameSku",
    "sameCondition",
    "sameSeller",
    "policySource",
    "expiresAt",
  ],
  recall: ["brand", "model", "noticeBrand", "noticeModel"],
  delivery: ["dueAt", "received"],
  refund: ["dueAt", "amountMinor", "received"],
};
const labels: Record<string, string> = {
  region: "Country code",
  source: "Evidence URL",
  observedAt: "Source observed at",
  excerpt: "Evidence excerpt",
  start: "Window starts",
  days: "Duration in 24-hour days",
  expiresAt: "Evidence valid until",
  paidMinor: "Paid amount in minor units",
  offerMinor: "Offer amount in minor units",
  sameSku: "Identical SKU",
  sameCondition: "Same condition",
  sameSeller: "Same seller",
  policySource: "Price adjustment policy URL",
  brand: "Purchased brand",
  model: "Purchased model",
  noticeBrand: "Brand on notice",
  noticeModel: "Model on notice",
  dueAt: "Expected by",
  amountMinor: "Promised amount in minor units",
  received: "I confirm receipt",
};
const dates = new Set(["start", "expiresAt", "dueAt", "observedAt"]);
const flags = new Set(["received", "sameSku", "sameCondition", "sameSeller"]);
type Insight = {
  caseId?: string;
  id: string;
  reason: string;
  deadline?: string;
  basis?: string;
  state: string;
  nextCheckAt: string | null;
  evidence: Observation;
};
export function Protection({
  purchase,
  onSaved,
}: {
  onSaved: () => void;
  purchase: { id: string; merchant: string; currency: string };
}) {
  const [kind, setKind] = useState<Kind>("return"),
    [records, setRecords] = useState<Insight[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [basis, setBasis] = useState("elapsed");
  const endpoint = `/api/v1/purchases/${purchase.id}/protection`;
  async function refresh() {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) throw Error("Protection records could not be loaded.");
    setRecords((await res.json()).data);
  }
  async function load() {
    setMessage("Loading protection records…");
    try {
      await refresh();
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = new FormData(form);
    const input: Record<string, unknown> = {
      kind,
      merchant: purchase.merchant,
    };
    if (kind === "refund" || kind === "price")
      input.currency = purchase.currency;
    setBusy(true);
    try {
      for (const key of [
        "source",
        "region",
        "observedAt",
        "excerpt",
        ...inputs[kind],
      ]) {
        const value = String(fields.get(key) ?? "");
        input[key] = flags.has(key)
          ? fields.has(key)
          : dates.has(key)
            ? new Date(value).toISOString()
            : key === "days"
              ? Number(value)
              : value;
      }
      if ((kind === "return" || kind === "warranty") && basis !== "elapsed") {
        input.calendar = {
          unit: basis,
          zone: fields.get("zone"),
          ...(basis === "date"
            ? { date: fields.get("lastDate") }
            : { count: Number(fields.get("count")) }),
        };
        input.days = 1;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok)
        throw Error(
          res.status === 422
            ? "Check the evidence URL, country code and values."
            : "Could not save evidence. Try again.",
        );
      await refresh();
      setMessage("Evidence saved.");
      onSaved();
      form.reset();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="protection-panel"
      onToggle={(e) => {
        if (e.currentTarget.open) void load();
      }}
    >
      <summary>Purchase protection</summary>
      <output>{message}</output>
      {records.length === 0 && !message && <p>No evidence recorded yet.</p>}
      {records.map((r) => (
        <article key={r.id}>
          <h3>{names[r.evidence.kind]}</h3>
          <strong>{r.state}</strong>
          <p>{r.reason}</p>
          {r.caseId && (
            <a href={"/cases#case-" + r.caseId}>Open recovery case</a>
          )}
          <p>
            Owner-reported · {r.evidence.region} ·{" "}
            {new Date(r.evidence.observedAt).toLocaleString()}
          </p>
          {r.deadline && (
            <p>
              {r.basis} · Window closes {new Date(r.deadline).toLocaleString()}
            </p>
          )}
          <blockquote>{r.evidence.excerpt}</blockquote>
          <a href={r.evidence.source} target="_blank" rel="noreferrer">
            View evidence
          </a>
          {r.nextCheckAt && (
            <p>
              Check due on next purchase view after{" "}
              {new Date(r.nextCheckAt).toLocaleString()}
            </p>
          )}
        </article>
      ))}
      <Research purchaseId={purchase.id} />
      <form onSubmit={save}>
        <h3>Record protection evidence</h3>
        <label>
          Protection type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            {Object.entries(names).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(kind === "return" || kind === "warranty") && (
          <fieldset>
            <legend>Policy timing</legend>
            <label>
              Deadline basis
              <select value={basis} onChange={(e) => setBasis(e.target.value)}>
                <option value="elapsed">Estimated elapsed days</option>
                <option value="date">
                  Last eligible calendar date (inclusive)
                </option>
                <option value="days">Calendar days after start</option>
                <option value="months">Calendar months after start</option>
              </select>
            </label>
            {basis !== "elapsed" && (
              <>
                <label>
                  Policy time zone
                  <input name="zone" required placeholder="America/New_York" />
                </label>
                {basis === "date" ? (
                  <label>
                    Last eligible date
                    <input name="lastDate" required type="date" />
                  </label>
                ) : (
                  <label>
                    Calendar periods
                    <input
                      name="count"
                      required
                      type="number"
                      min="1"
                      max="1200"
                    />
                  </label>
                )}
              </>
            )}
          </fieldset>
        )}
        {["region", "source", "observedAt", "excerpt", ...inputs[kind]]
          .filter((key) => key !== "days" || basis === "elapsed")
          .map((key) => (
            <label key={key}>
              {labels[key]}
              <input
                name={key}
                type={
                  flags.has(key)
                    ? "checkbox"
                    : dates.has(key)
                      ? "datetime-local"
                      : key === "source" || key === "policySource"
                        ? "url"
                        : key === "days"
                          ? "number"
                          : "text"
                }
                required={!flags.has(key)}
                pattern={key === "region" ? "[A-Z]{2}" : undefined}
              />
            </label>
          ))}
        <p>
          Times use your local time zone. Research and scheduled wake are
          awaiting verification.
        </p>
        <button type="submit" disabled={busy}>
          Save evidence
        </button>
      </form>
    </details>
  );
}
