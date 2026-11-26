# Deployment and operations runbook

## Accepted private topology

Revision `90f91c9` runs on one admin-only Sprite. Only the Next.js frontend has a routed service port behind the private Sprite edge. Next.js forwards API requests to Fastify on loopback. The journal process checks persisted work in SQLite while awake. Keep one writable database and its original receipts together on persistent storage. See the [deployment and restart evidence](evidence/M6.md).

The historical public-wake trial used a separate authenticated listener on all interfaces. It is non-production and has no deployment approval. Leave its token unset. Recovery after an operator-triggered wake is verified. Independently scheduled cold-private-Sprite wake remains unverified. [ADR-013](00-decisions.md)

## Runtime configuration

| Name | Consumer and purpose | Default or applicability | Handling |
|---|---|---|---|
| `APP_BASE_URL` | API origin checks and session configuration | API fallback `http://localhost:3000`. Launcher sets the exact loopback frontend origin for the selected profile. | Configuration |
| `AFTERCARE_API_PORT` | Fastify listener and Next.js API forwarding | 3101 by default, 3121 for the legacy launcher profile. Keep frontend and API aligned, including at frontend build time. | Configuration |
| `DEMO_SECRET` | API authentication for the read-only demo journal | Launcher generates a temporary secret. Supply a private value of at least 32 characters for separate-terminal use. | Secret |
| `SQLITE_PATH` | Journal database | API default `aftercare.sqlite` relative to process working directory. Legacy launcher selects `aftercare-m2.sqlite`. | Private storage path |
| `PRIVATE_UPLOAD_DIR` | Original receipt storage, access, export and cleanup | API default `private-uploads`. Legacy launcher selects `private-uploads-m2`. | Private storage path |
| `AFTERCARE_TAVILY_GATEWAY` | API connector adapter | Optional. Supply the official Sprite-scoped Tavily gateway associated with the restricted search/extract grant. | Deployment identifier. Keep provider credentials in the connector control plane. |
| `AFTERCARE_CF_ACCOUNT` | Receipt extraction adapter | Optional Cloudflare account identifier. Provider extraction requires both Cloudflare settings and consent. | Account identifier |
| `AFTERCARE_CF_AI_TOKEN` | Receipt extraction adapter | Optional provider credential. Manual review remains available. | Secret |
| `AFTERCARE_WAKE_TOKEN` | Enables the experimental authenticated wake listener | Unset for the private release. | Secret |
| `AFTERCARE_WAKE_PORT` | Experimental wake listener only | 8080 when enabled. | Configuration |
| `HOME`, `NODE_ENV` | Inherited by the local macOS Swift receipt helper | Passed through from the process environment. The helper supplies its own executable search path. | Host environment |

Use absolute custom storage paths on a persistent volume outside the checkout and web-served directories. Restrict access to the journal service account. Keep the database, its SQLite sidecars and receipt directory private. Back up the consistent database and original bytes together. Custom paths can fall outside repository ignore rules.

## Local port troubleshooting

When the launcher reports `EADDRINUSE`, identify the listener with `lsof -nP -iTCP:3101 -sTCP:LISTEN` and check frontend port 3000 the same way. For the legacy profile check 3121 and 3120. If the intended Aftercare instance is already running, open its vault URL. To restart your own instance, use Ctrl-C in its original terminal, wait for both ports to clear, then run the launcher again. Leave unfamiliar processes alone. Changing a database path or clearing account data cannot resolve a port conflict.

## Release operations

Use the pinned Node and pnpm versions, frozen lockfile and the private service layout recorded in M6. Preserve the original receipt digests and validate them after restore. Check the intended revision, authenticated access, persisted state and worker recovery when a deployment is separately authorized. Keep the Tavily grant restricted to search and extract. Promotional credits and alerts do not impose a hard spending cap.

## Recovering from a historical snapshot

1. Stop API, worker and wake delivery. Isolate the recovery environment from users, providers and outbound actions. Preserve the current database, WAL, receipts and logs separately. Restore into a fresh destination.
2. Check integrity, foreign keys, schema version, owner links, receipt hashes and audit heads using the M5 offline drill. Record backup time and the last consistent event. A valid historical chain proves internal consistency only.
3. Reconcile the intervening interval against newer journal copies, export records, approval consumption and revocation, deletion requests, provider acknowledgments and owner evidence. Match case, version, content hash and action identity. A downloaded claim may already have been used elsewhere.
4. Keep uncertain outcomes quarantined. Retire restored outstanding approvals through the normal revocation path before permitting new actions. Preserve confirmed completions and reconcile pending follow-ups and deletion requests. Require a fresh review and approval for any new consequential action. If evidence is unavailable, maintain isolation and escalate to the owner.
5. Validate the reconciled copy with exports and workers disabled. Record the reconciliation decisions and obtain owner sign-off before reopening access and resuming eligible jobs. Retain the pre-recovery evidence under the applicable privacy policy.
