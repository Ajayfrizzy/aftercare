"use client";
import Preferences from "../vault/preferences";
import Link from "next/link";
export default function Page() {
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
        <a href="/api/v1/exports/my-data">Download records</a>
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
    </div>
  );
}
