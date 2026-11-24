"use client";
import { useState } from "react";
const stages = [
  [
    "Check the receipt",
    "A sample receipt lists a field journal for USD 15.00. Review its merchant, item and purchase date before saving.",
  ],
  [
    "Review the commitment",
    "In this example the shop promised a refund by November 20. The recorded deadline passed without owner confirmation of receipt.",
  ],
  [
    "Prepare a follow-up",
    "Review the cited promise and the exact draft. Approval permits a one-time download. The owner decides whether to contact the merchant.",
  ],
] as const;
export default function Tour() {
  const [index, setIndex] = useState(0);
  return (
    <section aria-label="Synthetic product tour">
      <h2>Sample purchase walkthrough</h2>
      <p>Synthetic example · Paper shop</p>
      <output>
        Step {index + 1} of {stages.length}
      </output>
      <h3>{stages[index][0]}</h3>
      <p>{stages[index][1]}</p>
      <div className="tour-actions">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Previous
        </button>
        {index < stages.length - 1 ? (
          <button type="button" onClick={() => setIndex(index + 1)}>
            Next step
          </button>
        ) : (
          <button type="button" onClick={() => setIndex(0)}>
            Restart tour
          </button>
        )}
      </div>
    </section>
  );
}
