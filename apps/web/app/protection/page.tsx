"use client";
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
          entries.some((e) => e.state === state) && (
            <section key={state}>
              <h2>{label}</h2>
              {entries
                .filter((e) => e.state === state)
                .map((e) => (
                  <article key={e.id}>
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
