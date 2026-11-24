"use client";
import Controls from "./controls";
import { useEffect, useState } from "react";
import Link from "next/link";
type Activity = {
  events: { action: string; subject: string; created_at: string }[];
  jobs: {
    id: string;
    source: string;
    kind: string;
    observedAt: string;
    reason: string | null;
    attempts: number;
    failures: number;
    failed_at: string | null;
    completed_at: string | null;
    due_at: string;
    lease_until: string | null;
  }[];
};
export default function ActivityPage() {
  const [data, setData] = useState<Activity>(),
    [status, setStatus] = useState("Loading activity…");
  useEffect(() => {
    fetch("/api/v1/cases/activity", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            r.status === 401
              ? "Sign in to view your activity."
              : "Activity is temporarily unavailable.",
          );
        setData((await r.json()).data);
        setStatus("");
      })
      .catch((e) => setStatus(e.message));
  }, []);
  return (
    <div className="vault">
      <Link href="/cases">Recovery cases</Link>
      <h1>Agent activity</h1>
      <Controls />
      <output>{status}</output>
      {data && (
        <>
          <section>
            <h2>Protection checks</h2>
            {!data.jobs.length && <p>No checks recorded.</p>}
            {data.jobs.map((j) => (
              <article key={j.id}>
                <strong>
                  {j.failed_at
                    ? "Needs investigation"
                    : j.completed_at
                      ? "Completed"
                      : j.lease_until
                        ? "Lease recorded"
                        : j.failures
                          ? "Retry scheduled"
                          : "Scheduled"}
                </strong>
                <p>
                  {j.attempts} attempts · Due{" "}
                  {new Date(j.due_at).toLocaleString()}
                </p>
                <details>
                  <summary>Why this {j.kind} check runs</summary>
                  <p>
                    Aftercare evaluates the recorded {j.kind} evidence against
                    the purchase when this job is due.
                  </p>
                  {j.reason && (
                    <p>Reason recorded when the case opened: {j.reason}</p>
                  )}
                  <p>
                    Owner-reported source observed{" "}
                    {new Date(j.observedAt).toLocaleString()}.
                  </p>
                  <a href={j.source} rel="noreferrer" target="_blank">
                    Read source
                  </a>
                  {" · "}
                  <Link href={"/protection#observation-" + j.id}>
                    View current assessment
                  </Link>
                </details>
              </article>
            ))}
          </section>
          <section>
            <h2>Recovery history</h2>
            {!data.events.length && <p>No recovery actions recorded.</p>}
            {data.events.map((e, index) => (
              <p key={JSON.stringify([e, index])}>
                {e.action.replace("recovery_", "").replaceAll("_", " ")} ·{" "}
                {e.created_at} UTC
              </p>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
