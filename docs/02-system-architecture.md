# System architecture

## Runtime shape
```
Browser (Next.js UI; individual user)
    |
    v HTTPS / single public Sprite URL
Next.js frontend routing and Fastify API (`/api/v1`)
    |                    |
    | auth/RBAC          +-----> upload service (private files)
    |                    |
    +------ domain services / Zod contracts
                       |
          SQLite WAL + durable outbox + audit log
                       |
                leased agent worker
                       |
         deterministic policy/rules engine
                 |           |
        LLM adapter      research/adapters
                 |           |
        approved free    Tavily Fly connector ----> merchant sources
        model            CPSC official API (read only)
                       |
             approval/action executor
                       |
          verified provider OR explicit export
```

## Recommended repo layout
```
apps/web                 Next.js App Router pages/components
apps/api                 Fastify entrypoint, routes, auth, service coordinator
packages/contracts       Zod request/response schemas, shared enums
packages/domain          purchase/case/recovery rules, no I/O
packages/agent           workflow orchestration, scheduler, job leases
packages/connectors      Tavily, CPSC, LLM, outbound adapters
packages/db              migrations, transactions, repositories
packages/ui              tokens and shared accessible components
scripts                  fixtures, validation, setup diagnostics
.github/workflows         CI and checks
docs                     design/ADRs/evidence
.agents/skills            Codex skills
```

## Data-plane decisions
- `apps/api` is the sole direct writer to SQLite; worker invokes shared repositories in same process or via internal queue, not a second horizontally scaled node.
- Use `better-sqlite3` or a compatible driver with `busy_timeout`, WAL, FK checks, short transactions, migrations and backups. **Driver choice and versions are finalized at M0 after Sprite Node/runtime compatibility checks.**
- Read-only UI uses typed API responses; never query DB from browser. Avoid Server Actions bypassing Fastify's auth/authorization controls.
- Secure session cookie HttpOnly/Secure/SameSite=Lax, CSRF on mutations; login rate limiting; owner_id filters and object lookup by owner.
- Private uploads: random storage key, no user-supplied paths, scanner/type sniffing, size cap, streaming uploads and per-user quota; files inaccessible by public Sprite static hosting.
- Persist workflow steps and next_run_at; journal before/after any external action; classify timeouts as unknown, reconcile before retry.
- Outbound network limited to allowlisted hostnames where feasible; connector credentials never present in app settings/client.

## Agent separation
1. **Observation:** time, user-entered documents, third-party sources (tagged untrusted).
2. **Extraction:** LLM candidate facts with structured schema, provenance and missing fields.
3. **Deterministic checks:** merchant identity, dates, jurisdiction, price comparisons and approval constraints.
4. **Recommendation:** typed proposals with explanation/evidence; unverified facts flagged.
5. **Approval:** explicit previewed authorization, version and content hash.
6. **Execution:** one adapter, idempotency key, durable attempt, externally verified acknowledgment or export.
7. **Follow-up:** scheduled checks + user notifications; mark completed only with evidence.

## Reliability
- Background *in-process* timers operate only while Sprite is active. Treat sleep as real: no assumption of cron during hibernation. Wake on HTTP may trigger catch-up. To support true deadline-driven autonomous wakeups, M0 must verify a free external scheduled trigger or platform-supported wake mechanism; otherwise display a precise capability limitation and log gate failure.
- Scheduled jobs are persisted in UTC. `next_run_at` + `lease_until` + `attempts` + `last_error`; process all overdue jobs on wake within a bounded budget. Graceful shutdown drains or safely leaves lease expiry.
- SQLite durability does not equal external backup: daily snapshot/checkpoint plan plus consistent DB export; restore tested. Never rollback a Sprite checkpoint indiscriminately because it can roll back completed external-send records—reconciliation must run.
- Limit concurrent LLM calls, Tavily requests and document processing; surface throttling gracefully.

## Security and evidence invariants
- No external claims without approval bound to exact content/recipient.
- No money-received status inferred from merchant promise, price drop or AI summary.
- Every eligibility assertion references a current policy observation, effective scope and timestamp.
- Every external action has a unique `action_id`, one attempted dispatch at a time, and acknowledged remote outcome or `UNKNOWN`.
