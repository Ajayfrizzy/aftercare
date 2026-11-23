# Product requirements — Aftercare v0.1

## Mission and user
Protect a **person** after checkout by remembering purchases, detecting credible opportunities/risks, assembling evidence, and managing authorized recovery until resolved or explicitly closed. Core persona: someone shopping online across retailers who cannot manually track refunds, warranties, recalls and deadlines.

## Success criteria (measurable)
- First purchase import: complete a real image/PDF/text receipt flow with explicit user verification, no fabricated fields. Unknown data is nullable, not inferred.
- For each purchase: timeline, merchant, items, money/currency, dates, documents, and protection cards.
- Agent detects at least one real schedule-based case type and one external-information-based type with traceable source citations.
- One recovery case works end-to-end: evidence → proposal → approval → authorized dispatch or explicit export → follow-up → resolution or pending.
- All changes visible in audit timeline; restart resumes without duplicated external effects.
- UI usable at 360px mobile and desktop, with full keyboard operation and accessible screen-reader labels.

## Core flows / acceptance contracts
### F01 Onboarding and identity
- Personal account with secure email/password registration or explicitly verified alternate auth; sign-in/out, session management, profile/timezone/locale/currency, data export/delete; default UTC storage.
- User-defined notification and action preferences; consent for receipt parsing and third-party research. No card details collected.

### F02 Purchase and receipt vault
- Manual add and image/PDF/text receipt upload; OCR/LLM extraction with field-level evidence/confidence; user confirms merchant, dates, item names, price, currency, order ID and merchant website before acceptance.
- One purchase has multiple line items, receipts, order updates and notes; dedupe by user+merchant+order number where known and content hash otherwise, with an explicit review option.
- Merchant URL, item identifiers, serial/model, warranty proof and images; search, filters, tags, archive, document preview/download. Failed extraction doesn't lose uploaded document.

### F03 Returns and warranties
- Store policy source, scope/jurisdiction, observed date, exact quoted snippet (short), interpretation, unknown/ambiguous flags; calculate date windows deterministically with timezone and inclusivity tests.
- Manufacturer warranty and retailer return policy separate; distinguish policy, statutory rights and unverified assumptions. Reminders and escalation suggestions before expiry.

### F04 Merchant-policy research
- Agent researches merchant-specific return, refund and price-adjustment policies through **Tavily Sprite connector**, retrieves primary sources, records URLs, timestamps and confidence.
- Reject unmatched merchants, ambiguous products, expired sources and irrelevant jurisdictions. Provide 'verify with merchant' when authority is uncertain. Never invent terms.

### F05 Price-drop opportunities
- Record a defensible comparable offer (same product/SKU, region, currency, condition, seller and timestamp); identify potential adjustment only if available policy supports it.
- Exclude coupon/third-party mismatches unless declared. No guaranteed price-match claims. Demonstrate with live verifiable quote or transparent synthetic scenario.

### F06 Product recalls
- Use official CPSC recall feed as an initial **US-only** source; user can select market/country. Match brand/model/identifier and confidence; uncertain matches require user confirmation.
- Present severity and manufacturer/agency actions with official links; never provide dangerous repair instructions or suggest continued usage contrary to authority.

### F07 Delivery issue tracking
- Track expected/promised delivery and actual user-confirmed receipt. Attach delivery confirmations, photos and communications. No pretend courier tracking without integration.
- Late/missing/damaged case types use explicit evidence and merchant policy; user can correct or dispute detection.

### F08 Refund monitor
- Record merchant promise, status, expected amount, currency, date and proof. State that external bank receipt is **unverified** unless actual user-confirmation or authorized integrated verification exists.
- When deadline passes, propose follow-up. Distinguish `promised`, `processing`, `user_confirmed_received`, `evidence_confirmed_received` (only with trusted source), `disputed`, `unknown`.

### F09 Evidence-based claims
- Case builder lists issue, sources, confidence and counter-evidence; produces draft tailored to support channel and user consent. Never quote a policy without URL and retrieval time.
- Export shareable text/PDF/email draft with privacy redaction. Claim packs show what is known, what is missing, and next due date.

### F10 User-approved actions
- Every outgoing claim, merchant message, escalation or account modification requires action-preview + limited approval bound to body hash, recipient, medium, expiry and case version.
- If verified adapter sends, record provider receipt and delivery state. If none, produce an explicit copy/download and track `exported_not_sent`.
- Cannot claim issue resolved without evidence/user confirmation; no payment/chargeback execution.

### F11 Autonomous agent + memory
- Durable jobs revisit active cases, check deadlines, gather fresh sources when permitted, de-duplicate observations, propose next actions, and create on-site notifications.
- Memory contains structured purchase/case history and brief inspectable summaries; users can see and correct the remembered facts; no free-form hidden memory treated as ground truth.
- Pauses and cold wakes resume; if no external wake source, status tells user that monitoring catches up on visits rather than being always-on.

### F12 Audit, privacy and trust
- User-level audit activity with actor, action, time, evidence, outcome, reason; export/delete, encrypted transport, private documents, consent revocation.
- Must distinguish 'suggested', 'approved', 'executed', 'acknowledged', 'verified outcome'.

### F13 Polished experience
- Dashboard with protection summary, actionable alerts, purchase grid, case detail, approval center, agent activity, settings, onboarding, loading/empty/error and success states. Design specifics in `07-ui-ux-design-system.md`.

## P0/P1 timing note
All F01–F13 remain product scope. Work in vertical slices that protect end-to-end quality. If a live third-party access gate fails, implement the truthful manual/export pathway plus tracked blocker; do not silently remove the capability or label a stub live.

## Accessibility and internationalization
- WCAG 2.2 AA target; at least 44×44px tap targets, visible focus, contrast, reduced motion, semantic alerts, user timezone and locale-safe currency formatting. Currency amounts are decimal strings, not IEEE floating-point.
