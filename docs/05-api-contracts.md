# HTTP API proposal — `/api/v1`

## General conventions
- JSON success: `{data, meta?}`; error: `{error:{code,message,details?,requestId}}`. Strict Zod on requests/responses. Auth cookie, CSRF protection on state changes, user ownership checks.
- Paginate with cursors; limit and filter parameters validated. Use `Idempotency-Key` for creation and external-action endpoints. All dates UTC ISO 8601; currency minor amounts as decimal strings.
- Upload via `multipart/form-data` with declared 10 MB max/document (subject to M0 verified memory constraints), MIME sniff, auth, per-user total quota; no public file URLs.

## Routes
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | identity/session |
| GET | `/me` | preferences/session |
| PATCH | `/me/preferences` | timezone/currency/research consent |
| GET,POST | `/purchases` | paginated vault, manual entry |
| GET,PATCH,DELETE | `/purchases/:id` | details, corrections, controlled deletion |
| POST | `/purchases/:id/items` | line item creation |
| POST | `/artifacts/upload` | authenticated receipt/document |
| GET | `/artifacts/:id/download` | authorized private streaming |
| POST | `/artifacts/:id/extract` | queue extraction job |
| POST | `/extractions/:id/confirm` | commit user-reviewed values |
| GET | `/policies?merchantId=...` | source-linked policies |
| POST | `/purchases/:id/research` | queue policy research |
| GET | `/purchases/:id/protection` | deadlines, recall/price state |
| POST | `/purchases/:id/check` | request permitted research |
| GET,POST | `/cases` | list/create issue |
| GET,PATCH | `/cases/:id` | case timeline / user corrections |
| POST | `/cases/:id/evidence` | attach verified source |
| POST | `/cases/:id/claim-drafts` | create versioned draft |
| GET | `/cases/:id/claim-drafts/:version` | preview exact draft |
| POST | `/approvals` | approve exact action scope |
| POST | `/approvals/:id/revoke` | revoke pending action |
| POST | `/actions/:id/execute` | execute approved adapter or export |
| GET | `/actions/:id` | remote state and receipts |
| GET | `/agent/activity` | source-linked run log |
| GET | `/agent/status` | capabilities, last/next check, current mode |
| POST | `/agent/check-now` | bounded manual catch-up |
| GET,PATCH | `/notifications` | list/mark read |
| GET | `/exports/my-data` | data export |
| POST | `/me/delete-request` | revoke, schedule purge |
| GET | `/health/live`, `/health/ready` | service checks; no private info |

## Key typed envelopes
```ts
interface Money { currency: string; minor: string }
interface EvidenceLink { observationId?: string; artifactId?: string; url?: string; retrievedAt?: string; jurisdiction?: string; confidence: 'confirmed'|'provisional'|'conflicting'|'unknown' }
interface ProtectionInsight { kind: 'return'|'warranty'|'recall'|'price'|'delivery'|'refund'; state: 'safe'|'attention'|'urgent'|'unknown'; reason: string; dueAt?: string; evidence: EvidenceLink[] }
interface ActionApprovalRequest { draftId: string; version: number; recipient: string; channel: 'verified_adapter'|'export'; bodySha256: string; expiresAt: string }
interface AgentStatus { mode: 'scheduled_verified'|'on_wake'|'paused'; lastCheckedAt: string|null; nextPlannedAt: string|null; connectorHealth: 'ok'|'degraded'|'unavailable'; reason?: string }
```

## HTTP semantics
- `201` created, `202` accepted job (returns status URL), `200` read/updated, `204` delete/no content, `400` parse, `401` unauthenticated, `403` forbidden, `404` not found (mask foreign owner), `409` stale version/idempotency conflict, `422` semantic validation, `429` rate limit, `503` connector/model/cost gate unavailable.
- External dispatch returns `202` while awaiting provider; never return “sent” from queue insertion.

## Documentation and type generation
- Generate OpenAPI from Zod where verified, include concrete examples and exhaustive errors; test frontend-generated client against API fixtures. Do not allow duplicate independent handwritten type enums.
