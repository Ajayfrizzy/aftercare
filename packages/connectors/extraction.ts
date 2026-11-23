// MODEL-01 requires an approved account and verified free route before enabling inference.
export function extractionAvailability() {
  return {
    available: false,
    code: "MODEL_GATE_PENDING",
    reviewMode: "manual",
  } as const;
}
