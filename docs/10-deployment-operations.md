# Deployment and operations runbook

## Verified documentation facts and constraints
- Sprite gives persistent filesystem and auto-wake on inbound request; services can restart processes on wake. See Fly docs in `13-research-links.md`.
- The public URL exposes web/API to internet; must harden before enabling. Default organization-only auth is not a consumer-accessible demo.
- Idle Sprite may sleep: internal timers don't guarantee true scheduled wake. Need M0-proven external wake mechanism and a cost-safe plan before marketing uninterrupted monitoring.
- Fly Free pricing page includes a $5 allowance **and** says account may transition to pay-as-you-go at $5. Do not mistake allowance for a hard cost cap; actual signup/card/payment checks are mandatory.

## Environment and secrets (names only)
`NODE_ENV`, `APP_BASE_URL`, `SESSION_SECRET`, `SQLITE_PATH`, `PRIVATE_UPLOAD_DIR`, `FILE_UPLOAD_MAX_BYTES`, `INFERENCE_PROVIDER`, `INFERENCE_MODEL`, `AI_CALLS_DAILY_LIMIT`, `RESEARCH_CALLS_DAILY_LIMIT`, `PUBLIC_MONITORING_MODE`, `OUTBOUND_ACTIONS_ENABLED`, `MONITOR_WAKE_TOKEN_HASH`.
- Connector credentials must live in Fly's connector control plane, **not** `.env`; discover granted connector URL and scopes at runtime. Store opaque connection ID/config only.
- Never publish actual keys/tokens in docs or demo video.

## Deploy order
1. M0: check plan/card/cost and get explicit owner go/no-go; validate Sprite org, hostname and runtime Node version.
2. Create a dedicated Sprite scoped to Aftercare; keep URL private through smoke testing.
3. Install pinned Node/pnpm, build, configure private directories, run migrations with backup, startup health checks.
4. Register Fastify/web server as a Sprite service using verified version of `sprite-env services create`; bind `0.0.0.0:8080` behind Sprite HTTPS.
5. Set up Tavily connector at org level and grant only Aftercare Sprite access; live test with redacted logs and bounded API credits.
6. Configure inference only after verifying actual no-cost allowance and privacy terms.
7. Configure true timed wake only if separately validated; otherwise show on-wake mode in UI and docs.
8. Enable public URL only after auth, private docs, CSRF, quota, and threat checks pass.
9. Run end-to-end demo and record evidence, backup/restore and usage counters.

## Monitoring and incident handling
- Health endpoint: DB open, migrations current, queue lag, connector last success, upload capacity; no secrets/PII.
- Metrics: pending/due/dead-letter jobs, connector call count/errors, model call count/cost, approval/dispatch failures, backup age, import success.
- Expose `last_check`, `next_planned`, `mode`, and `wake_delay` to user; alert if stale.
- Deploy revisions only after consistent backup; verify restore on a **safe isolated copy**. If external actions ran after checkpoint, never blindly restore that old state without reconciliation.
- On connector failure: surface degraded state, retry bounded, preserve previous evidence with expiry warning.
- On cost threshold: pause new connector/model work and label degraded; **Fly plan charges may still accrue independently**. Monitor dashboard and stop/disable Sprite as necessary.

## Zero-cost policy
No automatic upgrade, no paid email vendor, no silently paid model, no payment details submitted without explicit user approval. If provider demands charge/card or cannot enforce the user's spending constraint, stop deployment and record blocker rather than violate budget.

## Why single Sprite
One persistent workspace is appropriate for Hacksgiving, not an indefinitely scalable architecture. Concurrent multi-instance deployment needs durable shared DB/storage and a migration plan—deferred via change control.

## Recovering from a historical snapshot

1. Stop API, worker and wake delivery. Isolate the recovery environment from users, providers and outbound actions. Preserve the current database, WAL, receipts and logs separately. Restore into a fresh destination.
2. Check integrity, foreign keys, schema version, owner links, receipt hashes and audit heads using the M5 offline drill. Record backup time and the last consistent event. A valid historical chain proves internal consistency only.
3. Reconcile the intervening interval against newer journal copies, export records, approval consumption and revocation, deletion requests, provider acknowledgments and owner evidence. Match case, version, content hash and action identity. A downloaded claim may already have been used elsewhere.
4. Keep uncertain outcomes quarantined. Retire restored outstanding approvals through the normal revocation path before permitting new actions. Preserve confirmed completions and reconcile pending follow-ups and deletion requests. Require a fresh review and approval for any new consequential action. If evidence is unavailable, maintain isolation and escalate to the owner.
5. Validate the reconciled copy with exports and workers disabled. Record the reconciliation decisions and obtain owner sign-off before reopening access and resuming eligible jobs. Retain the pre-recovery evidence under the applicable privacy policy.
