"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
type Attention = {
  id: string;
  purchaseId: string;
  merchant: string;
  state: string;
  reason: string;
  nextCheckAt: string | null;
};
type Summary = { items: number; cases: number; records: Attention[] };
export default function Overview() {
  const [summary, setSummary] = useState<Summary>(),
    [status, setStatus] = useState("Loading your journal…");
  const load = useCallback(async () => {
    try {
      const responses = await Promise.all(
        ["purchases", "cases", "protection"].map((path) =>
          fetch(`/api/v1/${path}`, { cache: "no-store" }),
        ),
      );
      if (responses.some((r) => r.status === 401)) {
        setSummary(undefined);
        setStatus("Sign in to open your journal.");
        return;
      }
      if (responses.some((r) => !r.ok)) throw Error();
      const [p, c, e] = await Promise.all(responses.map((r) => r.json()));
      setSummary({
        items: p.data.length,
        cases: c.data.length,
        records: e.data,
      });
      setStatus("");
    } catch {
      setStatus("Your journal could not be loaded.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="vault">
      <h1>Your journal</h1>
      <output>{status}</output>
      {status.includes("could not") && (
        <button type="button" onClick={load}>
          Try again
        </button>
      )}
      {!summary ? (
        <Link href="/vault">Open purchase vault</Link>
      ) : (
        <>
          <div className="summary-grid">
            <Link href="/vault">
              <strong>{summary.items}</strong> Recent purchases
            </Link>
            <Link href="/cases">
              <strong>{summary.cases}</strong> Recovery cases
            </Link>
            <Link href="/protection">
              <strong>
                {summary.records.filter((e) => e.state === "attention").length}
              </strong>{" "}
              Need attention
            </Link>
          </div>
          <section>
            <h2>Needs attention</h2>
            {summary.records
              .filter((e) => e.state === "attention")
              .map((e) => (
                <article key={e.id}>
                  <h3>{e.merchant}</h3>
                  <p>{e.reason}</p>
                  <Link href={`/vault#purchase-${e.purchaseId}`}>
                    Review purchase record
                  </Link>
                </article>
              ))}
            {!summary.records.some((e) => e.state === "attention") && (
              <p>No recorded checks currently need attention.</p>
            )}
          </section>
          <section>
            <h2>Upcoming checks</h2>
            {summary.records
              .filter((e) => e.nextCheckAt)
              .sort((a, b) =>
                String(a.nextCheckAt).localeCompare(String(b.nextCheckAt)),
              )
              .slice(0, 5)
              .map((e) => (
                <p key={e.id}>
                  {e.merchant} ·{" "}
                  {new Date(String(e.nextCheckAt)).toLocaleString()}
                </p>
              ))}
            {!summary.records.some((e) => e.nextCheckAt) && (
              <p>No upcoming checks recorded.</p>
            )}
            <Link href="/activity">View agent activity</Link>
          </section>
        </>
      )}
    </div>
  );
}
