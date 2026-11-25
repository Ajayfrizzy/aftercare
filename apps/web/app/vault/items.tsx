"use client";
import { GuidedField } from "../guided-field";
import { useState } from "react";
export default function Items({
  initial,
}: {
  initial: { name: string; minor: string }[];
}) {
  const [items, setItems] = useState(() =>
    initial.map((item, i) => ({ ...item, key: String(i) })),
  );
  return (
    <fieldset>
      <legend>Line items</legend>
      {items.map((item, i) => (
        <div className="item-row" key={item.key}>
          <GuidedField
            label="Item"
            hint="Copy the product name from this receipt line."
          >
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={item.name}
            />
          </GuidedField>
          <GuidedField
            label="Price in minor units"
            hint="Enter digits only. For ₦12.45 enter 1245 kobo. For US $12.45 enter 1245 cents."
          >
            <input
              name="minor"
              required
              inputMode="numeric"
              pattern="[0-9]{1,18}"
              defaultValue={item.minor}
            />
          </GuidedField>
          {items.length > 1 && (
            <button
              type="button"
              aria-label={`Remove item ${i + 1}`}
              onClick={() => setItems(items.filter((x) => x.key !== item.key))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={items.length >= 100}
        onClick={() =>
          setItems([
            ...items,
            { key: crypto.randomUUID(), name: "", minor: "" },
          ])
        }
      >
        Add item
      </button>
    </fieldset>
  );
}
