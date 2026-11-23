"use client";
import { useEffect, useState } from "react";
export default function Preferences() {
  const [data, setData] = useState<{
    locale: string;
    timezone: string;
    currency: string;
    researchConsent: boolean;
    extractionConsent: boolean;
  }>();
  const [status, setStatus] = useState("");
  useEffect(() => {
    fetch("/api/v1/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => setData(r.data.preferences))
      .catch(() => setStatus("Profile unavailable."));
  }, []);
  return (
    <details>
      <summary>Profile and consent</summary>
      {data && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await fetch("/api/v1/me/preferences", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(data),
              });
              setStatus(
                r.ok
                  ? "Preferences saved."
                  : "Check your locale, time zone and currency.",
              );
            } catch {
              setStatus("Preferences could not be saved.");
            }
          }}
        >
          {(["locale", "timezone", "currency"] as const).map((k) => (
            <label key={k}>
              {k}
              <input
                value={data[k]}
                onChange={(e) => setData({ ...data, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={data.extractionConsent}
              onChange={(e) =>
                setData({ ...data, extractionConsent: e.target.checked })
              }
            />
            Allow receipt extraction when available
          </label>
          <label>
            <input
              type="checkbox"
              checked={data.researchConsent}
              onChange={(e) =>
                setData({ ...data, researchConsent: e.target.checked })
              }
            />
            Allow merchant policy research when available
          </label>
          <button type="submit">Save preferences</button>
        </form>
      )}
      <output>{status}</output>
    </details>
  );
}
