"use client";
import { GuidedField } from "./guided-field";
import { useRef, useState } from "react";
import Link from "next/link";
type Hit = {
  label: string;
  href: string;
  id?: string;
  seen?: number;
  stamp?: string;
};
export default function Find() {
  const [query, setQuery] = useState(""),
    [hits, setHits] = useState<Hit[]>([]),
    [status, setStatus] = useState("");
  const generation = useRef(0);
  async function run(reminders: boolean) {
    const request = ++generation.current;
    setHits([]);
    setStatus("Loading…");
    try {
      const r = await fetch(
        "/api/v1/cases/find?" +
          new URLSearchParams({
            q: query,
            mode: reminders ? "reminders" : "search",
          }),
        { cache: "no-store" },
      );
      if (!r.ok)
        throw Error(
          r.status === 401
            ? "Sign in to search your journal."
            : "Search unavailable.",
        );
      const { data } = await r.json();
      if (request !== generation.current) return;
      setHits(data);
      setStatus(
        data.length
          ? data.length + (reminders ? " notifications." : " matching records.")
          : reminders
            ? "No journal notifications yet."
            : "No matching records.",
      );
    } catch (e) {
      if (request === generation.current) setStatus((e as Error).message);
    }
  }
  return (
    <section className="journal-find">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(false);
        }}
      >
        <GuidedField
          label="Search your journal"
          hint="Enter a merchant, purchase or case keyword to search your journal."
        >
          <input
            required
            maxLength={120}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </GuidedField>
        <button type="submit">Search</button>
        <button type="button" onClick={() => run(true)}>
          View notifications
        </button>
      </form>
      <output>{status}</output>
      <ul>
        {hits.map((h) => (
          <li key={h.id ?? h.href + h.label}>
            <Link href={h.href}>{h.label}</Link>
            {h.id && (
              <>
                <time>{h.stamp}</time>
                <span>{h.seen ? "Read" : "Unread"}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const current = generation.current;
                    try {
                      const res = await fetch(
                        "/api/v1/cases/notification-read",
                        {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ id: h.id, seen: !h.seen }),
                        },
                      );
                      if (!res.ok) throw Error();
                      if (current === generation.current)
                        setHits((rows) =>
                          rows.map((row) =>
                            row.id === h.id
                              ? { ...row, seen: Number(!h.seen) }
                              : row,
                          ),
                        );
                    } catch {
                      if (current === generation.current)
                        setStatus("Could not update notification. Try again.");
                    }
                  }}
                >
                  Mark as {h.seen ? "unread" : "read"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
