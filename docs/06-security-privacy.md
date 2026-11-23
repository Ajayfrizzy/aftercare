# Security, privacy and approval boundaries

## Trust model
Assets: purchase and receipt PII, order numbers, user identity, warranty serials, merchant correspondence, policy snapshots, action approval and connector access. Attackers: outside users, malicious documents/web pages, compromised merchant sites, cross-user ID guessing, compromised browser session, malicious connector response, replayed approvals.

## Required controls
1. **Authentication:** Argon2id or supported audited password KDF, secure session rotation, hashed session tokens, HttpOnly/Secure/SameSite cookies, login throttling and logout revocation. Validate email and require confirmation for sensitive data export/deletion.
2. **Authorization:** owner-scoped query conditions on every object; foreign IDs look like 404; access checks for files, audit, jobs, approvals and notifications; prevent mass assignment.
3. **CSRF/XSS:** CSRF defense for cookie-based writes; escape content in UI; avoid dangerous HTML; strict CSP where deploy compatible; sanitize downloadable HTML/text.
4. **Input/file security:** allow PDF/JPEG/PNG/plain text initially, MIME sniff, max size/total quota, random filenames, never render embedded JavaScript or execute macros, strip EXIF from previews when appropriate, PDF parse limits; no user-controlled filesystem paths.
5. **Prompt-injection resistance:** web/receipts/LLM outputs always untrusted; model tool permissions fixed by code; deny shell execution from content; require structured output; filter retrieval URLs via SSRF checks and domain validation.
6. **Approvals:** exact content and recipient SHA-256 bound to user/case/draft version/expiry; single-use nonce; revocation, stale-case invalidation; immutable approval event; consent separate from general auth.
7. **Outbound:** allowlist destinations, use verified domain ownership and HTTPS, no arbitrary webhook URL by LLM; request-timeouts/rate limits; never leak secrets or raw tokens.
8. **State integrity:** transactions for action records and audit, idempotency, conservative unknown responses, external reconciliation. No final settlement state without proof.
9. **Data minimization:** redact receipt PII and model inputs when possible, prohibit payment card storage, don't send documents to Tavily unless necessary/consented; model provider privacy terms checked during M0.
10. **Operational security:** no `.env`/tokens in git or screenshots; permissions/backup restore tested; public Sprite URL only if auth controls verified; no public file blobs or internal job endpoints.

## Consent
- Onboarding opt-in for external research and optional AI processing. Clear upload explanation listing third-party processors in use. User can revoke automated research, pause agent, export or request deletion.
- In-app settings distinguish `Research allowed`, `Proactive checks enabled`, `Notifications`, `External actions require approval` (cannot be disabled).

## Evidence and consumer-safety guardrails
- Do not imply legal advice or guaranteed return rights. Merchant voluntary policy, statutory warranty and manufacturer warranty are distinct.
- Recall claims from official agency/manufacturer, correct market, confirmed model. Safety-critical recalls receive priority and advice to follow official instructions.
- Refund confirmation requires user acknowledgement or authenticated primary evidence. A merchant email promising a refund does **not** prove receipt.
- Avoid unsupported threats/accusations in drafts, never invent transaction/order metadata, never call a merchant dishonest based on missing evidence.

## Threat tests
Cross-user purchase and PDF access; CSRF on approval; approval replay; modified draft hash; malicious Tavily result instructing agent to exfiltrate credentials; SSRF URL pointing at localhost/metadata endpoints; double-submit; job crash in flight; merchant confirms action but response times out; unauthorized deletion; duplicate upload; receipt containing HTML/script; expired policy used to assert entitlement.

## Before public demo
- Synthetic records only unless user explicitly consented, with synthetic merchants clearly marked.
- Disallow untrusted real external sends by default (`OUTBOUND_ACTIONS_ENABLED=false`) until verified adapter and user approval gate pass.
