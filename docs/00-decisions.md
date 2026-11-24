# ADR-000 — Product and architecture baseline

**APPROVED by the owner on 2026-11-23.** Approval covers ADR-001 through ADR-012. Account eligibility, billing, runtime compatibility and live integrations require separate verification before release.

## Fixed product decisions
- Aftercare is consumer-facing, individually owned, and focused only on post-purchase protection/recovery. NOT business procurement, general personal productivity, or a generic chat assistant.
- Preserve every agreed capability, avoid decorative filler or partial “fake” features, and build an end-to-end evidence-led resolution lifecycle.
- Persistent agent on Fly.io Sprite + ≥1 genuine Sprites connector. Tavily is the planned connector.
- Human-approved consequential external actions; transparent provenance; privacy controls; zero personal spending.
- Freeze design before implementation; changes need documented justification and owner authorization.

## Approved implementation decisions (baseline)
| ID | Decision | Rationale |
|---|---|---|
| ADR-001 | One TypeScript pnpm monorepo: `apps/web`, `apps/api`, `packages/contracts`, `packages/domain`, `packages/agent`, `packages/ui` | Shared typed contracts with clear code ownership |
| ADR-002 | Next.js web + Fastify API served via one Sprite public URL, API under `/api/v1` | Low-cost single entry point, mobile responsive |
| ADR-003 | SQLite WAL with Drizzle or equivalent pinned migration tool, **one writer** | Low complexity and persistent local state |
| ADR-004 | Durable DB-backed job scheduler and agent state machine, leased workers | Restart safety without paid queue |
| ADR-005 | Tavily via Fly Sprite connector, with web-source verification | Hackathon fit and grounded merchant-policy research |
| ADR-006 | AI pluggable provider; no mandatory paid model | Zero-spend gate; deterministic fallback may not impersonate AI |
| ADR-007 | All outgoing user-facing merchant communications go through approval + eligible provider adapter, or explicit export | No false “sent” statuses |
| ADR-008 | Source-grounded decision snapshots with recorded policy jurisdiction, retrieval time, and expiry | Avoid stale/unverified entitlements |
| ADR-009 | Local files in Sprite for demo with bounded size, privacy protections and backup strategy | No extra storage plan for M0 |
| ADR-010 | No multi-tenant business capabilities; per-user ownership enforced on every entity | Personal-agent focus |
| ADR-011 | Rich UI design system, dark and light themes, responsive detail screens, no chatbot-first navigation | High-quality usable product |
| ADR-012 | `staging` and `main` branch protections when configured; PR gates | Change discipline |

## Critical external checks before M1
- **GATE FLY-01:** Actual Fly signup, billing plan, payment method requirements, automatic plan transitions, credit availability and whether a true non-chargeable cost cap is available. Pricing language is inconsistent; **do not assume $5 allowance is a hard spending cap**.
- **GATE FLY-02:** Sprite creation, service auto-start/wake, storage persistence and real connector token-free request from the selected account.
- **GATE CONNECT-01:** Actual Tavily connector access, account key and free credits. Real search + page extraction with source URLs.
- **GATE MODEL-01:** Actual model provider and inference quota. Free access must be demonstrated. If no provider is free, pause AI-dependent features and obtain a viable zero-cost design by approval; do not quietly buy credits.
- **GATE WAKE-01:** Verify a **free and reliable wake trigger** for time-based checks while the Sprite is asleep. Until validated: perform catch-up on next wake, show `lastCheckedAt` and `monitoringMode=on_wake`; never promise uninterrupted proactive monitoring.
- **GATE OUTBOUND-01:** Validate specific external action adapter and approval flow. Otherwise use explicit downloadable claim/email draft, not claimed delivery.

## Non-goals for Hacksgiving
- Native bank/payment integration, automatic chargebacks, credit-card data collection, legal adjudication, cross-border jurisdiction guessing, merchant-side APIs without access, unrestricted browser agents, browser extension, mobile native apps, subscriptions/payment plans, enterprise accounts.

## Success test
A user uploads a receipt, sees verified structured records, gets independently researched policy evidence and a real monitored issue, approves a grounded claim/follow-up, sees honest delivery/export status, and watches persisted state recover after Sprite interruption.

## ADR-013 — External HTTPS wake signal (owner approved)

SQLite owns deadlines, leases and progress. The selected external wake provider is Cloudflare Workers Cron Triggers. cron-job.org documents that its executor accepts unverified server certificates, which exposes a reusable bearer credential to interception. On-demand wake remains the fallback. An always-awake process consumes ongoing compute.

The scheduled Worker has no public fetch handler or routes. Configure the exact HTTPS Sprite origin as a deployment binding. Its only subrequest is an empty POST to /wake using standard certificate validation, redirect rejection and a dedicated Worker secret. Put the matching secret in the Sprite environment and publish only the wake listener port. Journal and management endpoints stay separate. Reject unexpected response codes. A public ingress may incur compute before application authentication.

Before deploying, confirm Workers Free, an available Cron Trigger and no billing change on the chosen account. Configure UTC quarter-hour triggers. Allow up to 15 minutes for trigger propagation. Set an explicit UTC start and end spanning at most 30 minutes. The cutoff prevents further outbound signals even during delayed trigger removal. Remove the cron, delete the experimental Worker, revoke the secret, destroy the Sprite and verify inventories. Provider timeouts or missed calls leave overdue work eligible for the next SQLite pass. A per-process throttle resets at restart; conditional SQLite writes prevent duplicate follow-up effects.

Use a locally authenticated Wrangler session and the configuration scripts/wrangler.wake.jsonc. Supply nonsecret runtime bindings through deployment configuration. Use the encrypted secret binding WAKE_TOKEN and the matching AFTERCARE_WAKE_TOKEN on the Sprite; never put their values in configuration files, command arguments or logs. Observe only invocation times and success/failure on Cloudflare. Reconcile against Sprite-side job and audit records.

Sources: https://developers.cloudflare.com/workers/configuration/cron-triggers/, https://developers.cloudflare.com/workers/configuration/secrets/, https://developers.cloudflare.com/workers/platform/limits/ and https://cron-job.org/en/faq/.
