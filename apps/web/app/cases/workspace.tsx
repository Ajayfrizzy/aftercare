"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
type Receipt = { id: string; sha: string; mime: string; bytes: number };
type Case = {
  id: string;
  state: string;
  reason: string;
  evidence: { merchant: string; source: string; excerpt: string };
  history: { action: string; created_at: string }[];
  notes: { status: string; note: string; created_at: string }[];
  suggestion: string;
  activeApproval: { id: string; expires_at: string } | null;
  receipts: Receipt[];
  draft: {
    redact: string;
    preview: string;
    attachments: Receipt[];
    version: number;
    content_hash: string;
    body: string;
    recipient: string;
  } | null;
  exports: { follow_up_at: string; notified_at: string | null }[];
};
export function CaseWorkspace({
  approvalsOnly = false,
}: {
  approvalsOnly?: boolean;
}) {
  const [cases, setCases] = useState<Case[]>([]),
    [message, setMessage] = useState("Loading cases…"),
    [approvals, setApprovals] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const r = await fetch("/api/v1/cases", { cache: "no-store" });
    if (!r.ok) throw Error("Sign in to view cases.");
    const records: Case[] = (await r.json()).data;
    setCases(records);
    setApprovals(
      Object.fromEntries(
        records.flatMap((c) =>
          c.activeApproval ? [[c.id, c.activeApproval.id]] : [],
        ),
      ),
    );
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
      const format = (data as { format?: string }).format;
      const binary =
        name === "export" && (format === "pdf" || format === "eml");
      const result = binary ? {} : (await r.json()).data;
      if (name === "export") {
        const url = URL.createObjectURL(
          binary
            ? await r.blob()
            : result.attachments?.length
              ? new Blob([JSON.stringify(result)], { type: "application/json" })
              : new Blob([`Recipient: ${result.recipient}\n\n${result.body}`], {
                  type: "text/plain",
                }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = binary
          ? `aftercare-claim.${format}`
          : result.attachments?.length
            ? "aftercare-claim.json"
            : "aftercare-claim.txt";
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
      <Link href="/activity">Agent activity</Link>
      <h1>{approvalsOnly ? "Approval center" : "Recovery cases"}</h1>
      <output>{message}</output>
      {!cases.some((c) => !approvalsOnly || c.draft) && !message && (
        <p>
          {approvalsOnly
            ? "No saved drafts to review."
            : "No issues currently require a claim."}
        </p>
      )}
      {cases
        .filter((c) => !approvalsOnly || c.draft)
        .map((c) => (
          <section key={c.id} id={"case-" + c.id}>
            <h2>{c.evidence.merchant}</h2>
            <p>{c.reason}</p>
            <p>Case status · {c.state.replaceAll("_", " ")}</p>
            {!approvalsOnly && (
              <details>
                <summary>History and corrections</summary>
                {c.history.map((h, i) => (
                  <p key={JSON.stringify([i, h])}>
                    {h.action.replaceAll("_", " ")} · {h.created_at} UTC
                  </p>
                ))}
                {c.notes.map((n, i) => (
                  <blockquote key={JSON.stringify([i, n])}>
                    {n.note} · {n.status.replaceAll("_", " ")}
                  </blockquote>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      c,
                      "update",
                      Object.fromEntries(new FormData(e.currentTarget)),
                    );
                  }}
                >
                  <label>
                    Recovery status
                    <select name="status">
                      <option value="awaiting_owner">Awaiting owner</option>
                      <option value="awaiting_merchant">
                        Awaiting merchant
                      </option>
                      <option value="resolved_by_owner">
                        Resolved by owner
                      </option>
                    </select>
                  </label>
                  <label>
                    Correction or confirmation
                    <textarea name="note" maxLength={2000} required />
                  </label>
                  <button type="submit">Record update</button>
                </form>
              </details>
            )}
            <blockquote>{c.evidence.excerpt}</blockquote>
            <a href={c.evidence.source} rel="noreferrer" target="_blank">
              Evidence source
            </a>
            {!approvalsOnly && (
              <form
                key={c.draft?.version ?? 0}
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(c, "draft", {
                    ...Object.fromEntries(new FormData(e.currentTarget)),
                    attachments: new FormData(e.currentTarget).getAll(
                      "attachments",
                    ),
                  });
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
                <label>
                  Hide exact text in claim body
                  <input
                    name="redact"
                    maxLength={200}
                    defaultValue={c.draft?.redact}
                  />
                </label>
                <fieldset>
                  <legend>Receipt attachments</legend>
                  <p>
                    Selected files are included in full. Body redactions apply
                    only to the letter.
                  </p>
                  {c.receipts.length === 0 && (
                    <p>No confirmed receipt for this purchase.</p>
                  )}
                  {c.receipts.map((f) => (
                    <div key={f.id}>
                      <label>
                        <input
                          name="attachments"
                          type="checkbox"
                          value={f.id}
                          defaultChecked={c.draft?.attachments.some(
                            (a) => a.id === f.id,
                          )}
                        />{" "}
                        {f.mime} · {f.bytes} bytes · {f.sha.slice(0, 12)}
                      </label>
                      <a
                        href={"/api/v1/artifacts/" + f.id + "/preview"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Inspect receipt
                      </a>
                    </div>
                  ))}
                </fieldset>
                <button type="submit">Save draft</button>
              </form>
            )}
            {c.draft && (
              <details open={approvalsOnly || undefined}>
                <summary>Review saved version {c.draft.version}</summary>
                <p>For {c.draft.recipient}</p>
                <p className="letter">{c.draft.preview}</p>
                {c.draft.attachments.map((f) => (
                  <p key={f.id}>
                    Original receipt, including all personal information ·{" "}
                    {f.mime} · {f.bytes} bytes · {f.sha}
                  </p>
                ))}
                <p>
                  Approval permits a single download of this version for ten
                  minutes.
                </p>
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
                {(["pdf", "eml"] as const).map((format) => (
                  <button
                    type="button"
                    key={format}
                    onClick={() =>
                      action(c, "export", {
                        approvalId: approvals[c.id],
                        format,
                      })
                    }
                  >
                    {format === "pdf"
                      ? "Download PDF package"
                      : "Download email draft"}
                  </button>
                ))}
                <p>
                  Choose one download per approval. Open the email draft in your
                  mail app to review it before sending.
                </p>
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
                {x.notified_at
                  ? "Follow-up due. Review the merchant response."
                  : "Exported · Follow up " +
                    new Date(x.follow_up_at).toLocaleString()}
              </p>
            ))}
          </section>
        ))}
    </div>
  );
}
