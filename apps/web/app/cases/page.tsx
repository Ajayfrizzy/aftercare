"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
type Case = {
  id: string;
  state: string;
  reason: string;
  evidence: { merchant: string; source: string; excerpt: string };
  suggestion: string;
  draft: {
    version: number;
    content_hash: string;
    body: string;
    recipient: string;
  } | null;
  exports: { follow_up_at: string }[];
};
export default function Cases() {
  const [cases, setCases] = useState<Case[]>([]),
    [message, setMessage] = useState("Loading cases…"),
    [approvals, setApprovals] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const r = await fetch("/api/v1/cases", { cache: "no-store" });
    if (!r.ok) throw Error("Sign in to view cases.");
    setCases((await r.json()).data);
  }, []);
  useEffect(() => {
    load()
      .then(() => setMessage(""))
      .catch((e) => setMessage(e.message));
  }, [load]);
  async function action(c: Case, name: string, data: unknown) {
    try {
      const r = await fetch(`/api/v1/cases/${c.id}/${name}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok)
        throw Error(
          "Action unavailable. Refresh and review the current draft.",
        );
      const result = (await r.json()).data;
      if (name === "export") {
        const url = URL.createObjectURL(
          new Blob([`Recipient: ${result.recipient}\n\n${result.body}`], {
            type: "text/plain",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "aftercare-claim.txt";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setApprovals((old) => ({ ...old, [c.id]: result.approvalId ?? "" }));
      await load();
      setMessage(
        name === "export"
          ? "Claim exported. Delivery remains unconfirmed."
          : "Case updated.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <div className="vault">
      <Link href="/vault">Purchase vault</Link>
      <h1>Recovery cases</h1>
      <output>{message}</output>
      {!cases.length && !message && <p>No issues currently require a claim.</p>}
      {cases.map((c) => (
        <section key={c.id}>
          <h2>{c.evidence.merchant}</h2>
          <p>{c.reason}</p>
          <blockquote>{c.evidence.excerpt}</blockquote>
          <a href={c.evidence.source} rel="noreferrer" target="_blank">
            Evidence source
          </a>
          <form
            key={c.draft?.version ?? 0}
            onSubmit={(e) => {
              e.preventDefault();
              void action(
                c,
                "draft",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
            }}
          >
            <label>
              Intended recipient
              <input
                name="recipient"
                required
                defaultValue={c.draft?.recipient}
              />
            </label>
            <label>
              Claim text
              <textarea
                name="body"
                rows={5}
                required
                defaultValue={c.draft?.body ?? c.suggestion}
              />
            </label>
            <button type="submit">Save draft</button>
          </form>
          {c.draft && (
            <details>
              <summary>Review saved version {c.draft.version}</summary>
              <p>For {c.draft.recipient}</p>
              <p>{c.draft.body}</p>
              <button
                type="button"
                onClick={() =>
                  action(c, "approve", {
                    version: c.draft?.version,
                    contentHash: c.draft?.content_hash,
                  })
                }
              >
                Approve this version for download
              </button>
            </details>
          )}
          {approvals[c.id] && (
            <>
              <button
                type="button"
                onClick={() =>
                  action(c, "export", { approvalId: approvals[c.id] })
                }
              >
                Download approved claim
              </button>
              <button
                type="button"
                onClick={() =>
                  action(c, "revoke", { approvalId: approvals[c.id] })
                }
              >
                Revoke approval
              </button>
            </>
          )}
          {c.exports.map((x) => (
            <p key={x.follow_up_at}>
              Exported · Follow up {new Date(x.follow_up_at).toLocaleString()}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
