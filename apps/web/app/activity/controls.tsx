"use client";
import { useEffect, useState } from "react";
export default function Controls() {
  const [settings, setSettings] = useState<{
      paused: boolean;
      reminders: boolean;
    }>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/v1/cases/monitoring", { cache: "no-store" })
      .then(async (r) => {
        if (r.ok) setSettings((await r.json()).data);
      })
      .catch(() => setMessage("Monitoring settings unavailable."));
  }, []);
  async function save(next: { paused: boolean; reminders: boolean }) {
    setBusy(true);
    try {
      const r = await fetch("/api/v1/cases/monitoring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!r.ok) throw Error();
      setSettings((await r.json()).data);
      setMessage("Monitoring preferences saved.");
    } catch {
      setMessage("Could not update monitoring. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Monitoring</h2>
      {settings && (
        <>
          <p>
            {settings.paused
              ? "Your background checks are paused."
              : "Checks run while Aftercare is awake."}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => save({ ...settings, paused: !settings.paused })}
          >
            {settings.paused ? "Resume checks" : "Pause checks"}
          </button>
          <label>
            <input
              type="checkbox"
              checked={settings.reminders}
              disabled={busy}
              onChange={(e) =>
                save({ ...settings, reminders: e.target.checked })
              }
            />
            Follow-up reminders in my journal
          </label>
        </>
      )}
      <output>{message}</output>
    </section>
  );
}
