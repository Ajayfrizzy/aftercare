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

SQLite owns deadlines, leases and progress. A sleeping Sprite cannot run its internal timer. Configure cron-job.org to send an empty HTTPS POST to the dedicated wake listener at minutes 0, 15, 30 and 45 UTC. Store a random 32-byte wake-only bearer token in a custom Authorization header. Keep response storage and redirects disabled. Configure a finite expiresAt before enabling any experiment, inspect history afterwards, then delete the job and revoke its token. The management API key belongs only on the provisioning client. Never give the scheduler a Sprite management token.

Expose only the wake listener through the Sprite service HTTP port. Keep the journal API on loopback. Verify TLS, ingress authorization and empty failure responses before activation. A public ingress can wake compute before application authentication, so configure bounded trial expiry and monitor usage. The receiver authenticates before examining due work, coalesces authenticated calls within a minute per process and returns an empty success response. SQLite prevents duplicate notification effects across retries and restarts. Missed requests leave overdue work available for the next worker pass. Cold boot latency, scheduler outages and disabled jobs can delay checks. No guaranteed deadline or billing cap is implied.

Alternatives considered include on-demand catch-up (no independent trigger), permanently awake workers (ongoing compute) and a second hosted scheduling service (additional cost and credentials). cron-job.org documents free scheduled HTTP requests, custom headers and a management API with account-level limits. Fifteen-minute operation implies up to 96 requests per day; the cost of waking the Sprite must be measured separately. See https://docs.cron-job.org/rest-api.html and https://cron-job.org/en/faq/.
