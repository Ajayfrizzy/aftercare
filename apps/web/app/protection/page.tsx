"use client";
import { GuidedField } from "../guided-field";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
type Entry = {
  id: string;
  purchaseId: string;
  merchant: string;
  kind: string;
  source: string;
  observedAt: string;
  region: string;
  deadline?: string;
  basis?: string;
  state: string;
  reason: string;
  nextCheckAt: string | null;
};
export default function ProtectionCenter() {
  const [kind, setKind] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]),
    [status, setStatus] = useState("Loading protection checks…");
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/protection", { cache: "no-store" });
      if (!res.ok) {
        setStatus(
          res.status === 401
            ? "Sign in to view your protection checks."
            : "Could not load protection checks.",
        );
        return;
      }
      const { data } = await res.json();
      setEntries(data);
      setStatus(
        data.length
          ? ""
          : "No evidence recorded. Open a purchase to add your first check.",
      );
    } catch {
      setStatus("Could not load protection checks.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="vault">
      <Link href="/vault">Purchase vault</Link>
      <h1>Protection center</h1>
      <output>{status}</output>
      {entries.length > 0 && (
        <GuidedField
          label="View protection type"
          hint="Choose a category to narrow the list of recorded checks."
        >
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All checks</option>
            {Object.entries({
              return: "Returns",
              warranty: "Warranties",
              price: "Price opportunities",
              recall: "Recall notices",
              delivery: "Deliveries",
              refund: "Refunds",
            }).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </GuidedField>
      )}
      {kind && !entries.some((e) => e.kind === kind) && (
        <p>No records for this protection type.</p>
      )}
      {status.startsWith("Sign in") && (
        <Link href="/vault">Sign in or create an account</Link>
      )}
      {status.startsWith("Could not") && (
        <button type="button" onClick={load}>
          Try again
        </button>
      )}
      {Object.entries({
        attention: "Needs attention",
        unknown: "Needs verification",
        monitoring: "Monitoring",
        closed: "Closed",
      }).map(
        ([state, label]) =>
          entries.some(
            (e) => e.state === state && (!kind || e.kind === kind),
          ) && (
            <section key={state}>
              <h2>{label}</h2>
              {entries
                .filter((e) => e.state === state && (!kind || e.kind === kind))
                .map((e) => (
                  <article id={"observation-" + e.id} key={e.id}>
                    <h3>
                      {e.merchant} · {e.kind}
                    </h3>
                    <p>{e.reason}</p>
                    <p>
                      Owner-reported · {e.region} ·{" "}
                      {new Date(e.observedAt).toLocaleString()}
                    </p>
                    {e.deadline && (
                      <p>
                        {e.basis} · Closes{" "}
                        {new Date(e.deadline).toLocaleString()}
                      </p>
                    )}
                    <a href={e.source} rel="noreferrer" target="_blank">
                      Evidence source
                    </a>{" "}
                    <Link href={`/vault#purchase-${e.purchaseId}`}>
                      Purchase details
                    </Link>
                  </article>
                ))}
            </section>
          ),
      )}
    </div>
  );
}
