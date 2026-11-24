"use client";
import DeleteAccount from "./delete-account";
import { useEffect, useState } from "react";
import Preferences from "../vault/preferences";
import Link from "next/link";
export default function Page() {
  const [access, setAccess] = useState("loading");
  useEffect(() => {
    let current = true;
    fetch("/api/v1/me", { cache: "no-store" })
      .then((r) => {
        if (current)
          setAccess(
            r.ok ? "ready" : r.status === 401 ? "signed-out" : "failed",
          );
      })
      .catch(() => {
        if (current) setAccess("failed");
      });
    return () => {
      current = false;
    };
  }, []);
  const [deleted, setDeleted] = useState(false);
  if (deleted)
    return (
      <div className="vault">
        <h1>Account deleted</h1>
        <p>Your sessions are closed. Receipt file cleanup is queued.</p>
        <Link href="/">Return home</Link>
      </div>
    );
  if (access !== "ready")
    return (
      <div className="vault">
        <h1>Privacy settings</h1>
        <output>
          {access === "loading"
            ? "Opening account settings…"
            : access === "signed-out"
              ? "Sign in to manage your privacy."
              : "Account settings could not be loaded."}
        </output>
        {access === "signed-out" ? (
          <Link href="/vault">Sign in</Link>
        ) : (
          access === "failed" && (
            <button
              type="button"
              onClick={() => {
                setAccess("loading");
                location.reload();
              }}
            >
              Retry
            </button>
          )
        )}
      </div>
    );
  return (
    <div className="vault">
      <h1>Privacy settings</h1>
      <section>
        <h2>Account preferences</h2>
        <Preferences
          settings
          onEntry={() => location.assign("/vault")}
          onImport={() => location.assign("/vault")}
        />
        <Link href="/vault">Open account</Link>
      </section>
      <section>
        <h2>Download journal records</h2>
        <p>
          Save your profile, purchases, receipt references, reviewed fields,
          protection evidence, drafts and activity as JSON. Original receipt
          files are available from their purchases.
        </p>
        <details>
          <summary>Prepare private export</summary>
          <p>
            Confirm that you want to save these private records on this device.
          </p>
          <a href="/api/v1/exports/my-data">Download records</a>
        </details>
      </section>
      <section>
        <h2>Connected services</h2>
        <dl>
          <dt>Receipt inference and Tavily research</dt>
          <dd>Pending free provider and Sprite connector verification.</dd>
          <dt>Scheduled monitoring</dt>
          <dd>
            Local checks run while the service is awake. Scheduled Sprite wake
            awaits verification.
          </dd>
          <dt>Merchant communications</dt>
          <dd>
            Approved claims are available for download. Delivery requires a
            separate action by you.
          </dd>
        </dl>
      </section>
      <DeleteAccount done={() => setDeleted(true)} />
    </div>
  );
}
