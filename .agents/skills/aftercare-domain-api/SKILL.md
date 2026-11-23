---
name: aftercare-domain-api
description: Use when implementing Aftercare purchases, receipts, cases, refunds, database migrations, typed API routes, auth and ownership constraints.
---

# Aftercare Domain Api

Read `docs/03-data-model.md`, `docs/05-api-contracts.md`, `docs/06-security-privacy.md`. Implement one vertical slice using strict Zod contracts and transaction-aware SQLite repositories. Add migrations, fixtures and cross-user isolation tests. Use exact decimal-string minor units, UTC dates, explicit uncertainty and append-only audit events. Ensure API failures have consistent typed codes, no private artifacts are served publicly, and every mutation has CSRF/authorization and idempotency where applicable. Run affected integration tests and record evidence.

## Output required
Report implemented artifacts, changed files, tests executed, exact remaining risks, and the milestone exit result.
