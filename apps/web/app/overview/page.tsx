"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
type Attention = {
  id: string;
  purchaseId: string;
  potentialRefund?: { currency: string; minor: string; dueAt: string } | null;
  merchant: string;
  source: string;
  state: string;
  reason: string;
  deadline?: string;
  nextCheckAt: string | null;
};
type Summary = {
  events: { action: string; created_at: string }[];
  lastChecked: string | null;
  paused: boolean;
  items: number;
  cases: number;
  records: Attention[];
};
export default function Overview() {
  const [summary, setSummary] = useState<Summary>(),
    [status, setStatus] = useState("Loading your journal…");
  const load = useCallback(async () => {
    try {
      const responses = await Promise.all(
        [
          "purchases",
          "cases",
          "protection",
          "cases/activity",
          "cases/monitoring",
        ].map((path) => fetch(`/api/v1/${path}`, { cache: "no-store" })),
      );
      if (responses.some((r) => r.status === 401)) {
        setSummary(undefined);
        setStatus("Sign in to open your journal.");
        return;
      }
      if (responses.some((r) => !r.ok)) throw Error();
      const [p, c, e, activity, monitor] = await Promise.all(
        responses.map((r) => r.json()),
      );
      setSummary({
        events: activity.data.events.slice(0, 3),
        lastChecked:
          activity.data.jobs
            .map((j: { completed_at: string | null }) => j.completed_at)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
        paused: monitor.data.paused,
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
            <h2>Refund commitments</h2>
            {summary.records.some((e) => e.potentialRefund) ? (
              summary.records
                .filter((e) => e.potentialRefund)
                .map((e) => (
                  <p key={e.id}>
                    {e.merchant} · {e.potentialRefund?.minor} minor units (
                    {e.potentialRefund?.currency}) · receipt unconfirmed
                    {" · "}Promised by{" "}
                    <time dateTime={e.potentialRefund?.dueAt}>
                      {new Date(e.potentialRefund!.dueAt).toLocaleString()}
                    </time>
                    {" · "}
                    <a
                      href={e.source}
                      aria-label={`Refund source for ${e.merchant}`}
                    >
                      View source
                    </a>
                  </p>
                ))
            ) : (
              <p>No outstanding amounts recorded.</p>
            )}
          </section>
          <section>
            <h2>Latest activity</h2>
            <p>
              {summary.paused
                ? "Monitoring paused."
                : "Checks run while Aftercare is awake."}{" "}
              {summary.lastChecked
                ? `Last completed check: ${new Date(summary.lastChecked).toLocaleString()}`
                : "No completed check recorded."}
            </p>
            {summary.events.map((e) => (
              <p key={e.created_at + e.action}>
                {e.action.replaceAll("_", " ")} · {e.created_at} UTC
              </p>
            ))}
          </section>
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
            <h2>Protection deadlines</h2>
            {summary.records
              .filter((e) => e.deadline && Date.parse(e.deadline) >= Date.now())
              .sort((a, b) => Date.parse(a.deadline!) - Date.parse(b.deadline!))
              .slice(0, 5)
              .map((e) => (
                <p key={e.id}>
                  <Link href={"/protection#observation-" + e.id}>
                    {e.merchant}
                  </Link>
                  {" · "}
                  <time dateTime={e.deadline}>
                    {new Date(e.deadline!).toLocaleString()}
                  </time>
                </p>
              ))}
            {!summary.records.some(
              (e) => e.deadline && Date.parse(e.deadline) >= Date.now(),
            ) && (
              <p>
                No upcoming deadlines. Open a purchase to record its return or
                warranty terms.
              </p>
            )}
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
