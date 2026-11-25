"use client";
import { purchaseInput } from "@aftercare/contracts";
import { useState } from "react";

const guidance = {
  merchantWebsite:
    "Enter a website such as github.com or https://shop.example, or leave it blank.",
  currency:
    "Enter a three-letter currency code in capitals, such as USD or NGN.",
};

export function PurchaseField({
  name,
  label,
  initial,
}: {
  name: keyof typeof guidance;
  label: string;
  initial?: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [touched, setTouched] = useState(false);
  const valid = purchaseInput.shape[name].safeParse(value).success;
  const invalid = touched && !valid;
  return (
    <label>
      <span id={name + "-label"}>{label}</span>
      <input
        name={name}
        aria-labelledby={name + "-label"}
        aria-describedby={name + "-help"}
        aria-invalid={invalid || undefined}
        value={value}
        required={name === "currency"}
        onChange={(e) => {
          const input = e.currentTarget;
          setValue(input.value);
          input.setCustomValidity(
            purchaseInput.shape[name].safeParse(input.value).success
              ? ""
              : guidance[name],
          );
        }}
        onBlur={(e) => {
          setTouched(true);
          e.currentTarget.setCustomValidity(valid ? "" : guidance[name]);
        }}
        onInvalid={() => setTouched(true)}
        ref={(input) => {
          if (input) input.setCustomValidity(valid ? "" : guidance[name]);
        }}
      />
      <small id={name + "-help"} aria-live="polite">
        {invalid ? "Please check this field. " : ""}
        {guidance[name]}
      </small>
    </label>
  );
}
