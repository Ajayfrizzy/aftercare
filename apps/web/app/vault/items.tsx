"use client";
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
          <label>
            Item
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={item.name}
            />
          </label>
          <label>
            Price in minor units
            <input
              name="minor"
              required
              inputMode="numeric"
              pattern="[0-9]{1,18}"
              defaultValue={item.minor}
            />
          </label>
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
