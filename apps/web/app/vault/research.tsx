"use client";
import { useState } from "react";
export function Research({ purchaseId }: { purchaseId: string }) {
  const [kind, setKind] = useState("policy"),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const [results, setResults] = useState<
    {
      source: string;
      text?: string;
      title?: string;
      identity?: string;
      retrievedAt: string;
    }[]
  >([]);
  return (
    <details>
      <summary>Research policies and recall notices</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const fields = new FormData(e.currentTarget);
          setBusy(true);
          setResults([]);
          setStatus("Checking research availability…");
          try {
            const res = await fetch(
              `/api/v1/purchases/${purchaseId}/research`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ kind, ...Object.fromEntries(fields) }),
              },
            );
            const body = await res.json();
            if (!res.ok) {
              setStatus(
                body.error?.code === "PROVIDER_GATE_PENDING"
                  ? "External research is pending provider verification. You can record your own source below."
                  : "Research unavailable. Check permission and inputs.",
              );
              return;
            }
            setResults(body.data);
            setStatus(
              body.data.length
                ? "Retrieved sources require review."
                : "No matching sources found.",
            );
          } catch {
            setStatus("Research unavailable. Try again later.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Research task
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setResults([]);
              setStatus("");
            }}
          >
            <option value="policy">Merchant policy</option>
            <option value="price">Price adjustment policy</option>
            <option value="recall">US recall notices</option>
          </select>
        </label>
        <label>
          Research region
          <input
            key={kind}
            name="region"
            required
            pattern="[A-Z]{2}"
            defaultValue={kind === "recall" ? "US" : ""}
            readOnly={kind === "recall"}
          />
        </label>
        {kind === "recall" ? (
          <>
            <label>
              Product brand
              <input name="brand" required />
            </label>
            <label>
              Product model
              <input name="model" required />
            </label>
          </>
        ) : (
          <label>
            Merchant website domain
            <input name="domain" placeholder="shop.example" required />
          </label>
        )}
        <button type="submit" disabled={busy}>
          Check research availability
        </button>
        <output>{status}</output>
        {results.map((r) => (
          <article key={r.source}>
            <a href={r.source} rel="noreferrer" target="_blank">
              External source
            </a>
            <p>{r.title ?? r.text}</p>
            {r.identity && <p>{r.identity}</p>}
            <time>{r.retrievedAt}</time>
          </article>
        ))}
      </form>
    </details>
  );
}
