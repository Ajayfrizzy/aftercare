"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Activity = {
  events: { action: string; subject: string; created_at: string }[];
  jobs: {
    id: string;
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
