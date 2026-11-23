"use client";
import { useEffect, useState } from "react";
export default function Preferences({
  onEntry,
  onImport,
  initialGuide = false,
}: {
  onEntry: () => void;
  onImport: () => void;
  initialGuide?: boolean;
}) {
  const [data, setData] = useState<{
    locale: string;
    timezone: string;
    currency: string;
    researchConsent: boolean;
    extractionConsent: boolean;
  }>();
  const [step, setStep] = useState(initialGuide ? 1 : 0);
  const [status, setStatus] = useState("");
  useEffect(() => {
    fetch("/api/v1/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => setData(r.data.preferences))
      .catch(() => setStatus("Profile unavailable."));
  }, []);
  return (
    <details open={step > 0 || undefined}>
      <summary>Profile and consent</summary>
      {step === 0 && (
        <button type="button" onClick={() => setStep(1)}>
          Start setup guide
        </button>
      )}
      {step > 0 && (
        <>
          <progress aria-label="Setup progress" max={3} value={step} />
          <h2>
            {
              [
                "",
                "Choose your regional settings",
                "Choose your permissions",
                "Add your first purchase",
              ][step]
            }
          </h2>
          <button type="button" onClick={() => setStep(0)}>
            Exit guide
          </button>
        </>
      )}
      {step === 3 && (
        <div>
          <p>
            Try a field journal from a bookshop, or use your own purchase. Your
            receipt stays private to your account.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              onEntry();
            }}
          >
            Enter purchase manually
          </button>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              onImport();
            }}
          >
            Choose a receipt
          </button>
        </div>
      )}
      {step !== 3 && data && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (step === 1) {
              setStep(2);
              return;
            }
            try {
              const r = await fetch("/api/v1/me/preferences", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(data),
              });
              if (r.ok && step === 2) setStep(3);
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
          {step !== 2 &&
            (["locale", "timezone", "currency"] as const).map((k) => (
              <label key={k}>
                {k}
                <input
                  value={data[k]}
                  onChange={(e) => setData({ ...data, [k]: e.target.value })}
                />
              </label>
            ))}
          {step !== 1 && (
            <>
              <p>
                Both permissions are optional. You can enter and review
                purchases yourself and change your choices later.
              </p>
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
            </>
          )}
          <button type="submit">
            {step === 1
              ? "Continue"
              : step === 2
                ? "Save choices"
                : "Save preferences"}
          </button>
        </form>
      )}
      <output>{status}</output>
    </details>
  );
}
