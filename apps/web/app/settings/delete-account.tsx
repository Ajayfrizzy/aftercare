"use client";
import { GuidedField } from "../guided-field";
import { useState } from "react";
export default function DeleteAccount({ done }: { done: () => void }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section>
      <details>
        <summary>Delete my account</summary>
        <p>
          This permanently closes your account, signs out all sessions and
          removes your journal, evidence, cases and activity from the active
          database. Private receipt files are queued for removal. Existing
          backups and copies you downloaded are separate.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            setBusy(true);
            try {
              const r = await fetch("/api/v1/me/delete-request", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(data),
              });
              if (r.status === 202) {
                form.reset();
                done();
                return;
              }
              setMessage(
                r.status === 401
                  ? "Sign in again to delete your account."
                  : r.status === 429
                    ? "Too many attempts. Wait a minute before trying again."
                    : "Check your email, password and confirmation.",
              );
            } catch {
              setMessage(
                "The response was interrupted. Check whether you can still sign in before retrying.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <GuidedField
            label="Account email"
            hint="Enter the email address you use to sign in."
          >
            <input required type="email" name="email" autoComplete="username" />
          </GuidedField>
          <GuidedField
            label="Current password"
            hint="Enter your current Aftercare password to authorize deletion."
          >
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </GuidedField>
          <GuidedField
            label="Type DELETE to confirm"
            hint="Enter the word DELETE in uppercase to confirm permanent deletion."
          >
            <input
              required
              pattern="DELETE"
              name="confirmation"
              autoComplete="off"
            />
          </GuidedField>
          <button disabled={busy} type="submit">
            {busy ? "Deleting account…" : "Permanently delete account"}
          </button>
          <output>{message}</output>
        </form>
      </details>
    </section>
  );
}
