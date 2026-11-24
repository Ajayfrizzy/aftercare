"use client";
import { useState } from "react";
import Link from "next/link";
type Hit = { label: string; href: string };
export default function Find() {
  const [query, setQuery] = useState(""),
    [hits, setHits] = useState<Hit[]>([]),
    [status, setStatus] = useState("");
  async function run(reminders: boolean) {
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
      setHits(data);
      setStatus(
        data.length
          ? ""
          : reminders
            ? "No due follow-up reminders."
            : "No matching records.",
      );
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  return (
    <details className="journal-find">
      <summary>Search and notifications</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(false);
        }}
      >
        <label>
          Search your journal
          <input
            required
            maxLength={120}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="submit">Search</button>
        <button type="button" onClick={() => run(true)}>
          View notifications
        </button>
      </form>
      <output>{status}</output>
      <ul>
        {hits.map((h) => (
          <li key={h.href + h.label}>
            <Link href={h.href}>{h.label}</Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
