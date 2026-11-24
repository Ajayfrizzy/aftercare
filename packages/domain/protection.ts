import type { Observation } from "../contracts/index.ts";
export function evaluate(
  input: Observation,
  purchase: { merchant: string; currency: string },
  now: number,
) {
  const result = (
    state: "unknown" | "monitoring" | "attention" | "closed",
    reason: string,
    nextCheckAt: string | null = null,
  ) => ({ state, reason, nextCheckAt, confidence: "user_reported" as const });
  if (
    input.merchant.trim().toLowerCase() !==
    purchase.merchant.trim().toLowerCase()
  )
    return result("unknown", "Merchant does not match the purchase.");
  if (Date.parse(input.observedAt) > now)
    return result("unknown", "Observation date is in the future.");
  if ("expiresAt" in input && Date.parse(input.expiresAt) <= now)
    return result("unknown", "Source requires a fresh review.");
  if ("currency" in input && input.currency !== purchase.currency)
    return result("unknown", "Currency differs from the purchase.");
  switch (input.kind) {
    case "return":
    case "warranty": {
      const end = Date.parse(input.start) + input.days * 86400000;
      const remaining = end - now;
      return result(
        remaining <= 0
          ? "closed"
          : remaining <= 7 * 86400000
            ? "attention"
            : "monitoring",
        remaining <= 0
          ? "Estimated window has elapsed."
          : "Estimated deadline using the recorded duration.",
        remaining > 0 ? new Date(end).toISOString() : null,
      );
    }
    case "delivery":
    case "refund":
      if (input.received)
        return result("closed", "Receipt confirmed by the owner.");
      return Date.parse(input.dueAt) <= now
        ? result("attention", "Expected date passed. Receipt is unconfirmed.")
        : result(
            "monitoring",
            "Awaiting the recorded commitment.",
            input.dueAt,
          );
    case "price":
      if (!input.sameSku || !input.sameCondition || !input.sameSeller)
        return result("unknown", "Offer comparability is incomplete.");
      return BigInt(input.offerMinor) < BigInt(input.paidMinor)
        ? result(
            "attention",
            "Lower comparable offer reported. Verify adjustment eligibility.",
          )
        : result("monitoring", "Recorded offer shows no reduction.");
    case "recall": {
      const url = new URL(input.source);
      if (
        input.region !== "US" ||
        url.hostname !== "www.cpsc.gov" ||
        !url.pathname.toLowerCase().startsWith("/recalls/")
      )
        return result(
          "unknown",
          "An official US CPSC recall notice is required.",
        );
      const normalize = (s: string) => s.trim().toLowerCase();
      return normalize(input.model) === normalize(input.noticeModel) &&
        normalize(input.brand) === normalize(input.noticeBrand)
        ? result(
            "attention",
            "Reported brand and model match the cited notice. Review official instructions.",
          )
        : result("unknown", "Identifiers do not establish a recall match.");
    }
  }
}
