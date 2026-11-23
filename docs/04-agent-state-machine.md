# Agent execution contract and durable state machines

## Monitoring lifecycle
`queued -> leased -> observing -> evaluating -> (no_change | needs_more_evidence | proposing_action | completed) -> scheduled_next_check`
Failure paths: `retry_wait`, `dead_letter`, `cancelled`, `unknown_external_outcome`.

## Purchase case state machine
```
NEW -> INVESTIGATING -> EVIDENCE_READY -> ACTION_PROPOSED
                                  |             |
                                  v             v
                              NEEDS_USER    AWAITING_APPROVAL
                                                  |
                              REJECTED/CANCELLED <-+-> APPROVED
                                                         |
                                                     DISPATCHING
                                                     /    |                                              ACKNOWLEDGED UNKNOWN FAILED
                                               |           |      |
                                         AWAITING_REPLY  RECONCILE RETRY_POLICY
                                               |
                                       RESOLVED / FOLLOW_UP / CLOSED
```
- Proposals are versioned. Edits invalidate prior approvals. Approval expires at bounded time.
- `DISPATCHING -> UNKNOWN`: after timeout, never blindly retry a potentially non-idempotent merchant action. First reconcile by remote idempotency/provider reference or require human review.
- Export route: `APPROVED -> EXPORTED_NOT_SENT` and subsequent user-reported submission tracking; no remote delivery claim.
- `RESOLVED` requires proof of resolution or user attestation; store evidence type.

## Core typed job kinds
`IMPORT_PARSE`, `POLICY_RESEARCH`, `WINDOW_RECALC`, `RECALL_CHECK`, `PRICE_CHECK`, `DELIVERY_CHECK`, `REFUND_DUE_CHECK`, `CASE_REEVALUATE`, `ACTION_RECONCILE`, `FOLLOW_UP_DUE`, `SEND_NOTIFICATION`, `DATA_PURGE`.

## Lease and concurrency mechanics
- Jobs unique on stable dedupe key derived from user/subject/job kind/check target/time bucket; duplicate enqueue returns existing live job.
- Worker claims due job transactionally and atomically sets `leased_until`. Heartbeat renews for long operations. Only current lease owner can finalize.
- Persist transition to `observing` **before** calling connector; persist raw evidence + checksum before reasoning; persist proposed action + evidence refs before notification.
- Backoff exponential with jitter, bounded attempts; distinguish authentication, rate limits, transient network, untrusted source, malformed content, model invalid JSON, provider unknown status.
- Shutdown and restart: leases expire; recovery inspects latest checkpoint and outstanding remote calls. Do not duplicate network effects.

## Periodic checks and Sprite sleep
- **Always persist due time** and display `last checked`, `next planned`, and `monitoring status`.
- When Sprite is awake, use bounded polling. On HTTP wake, rehydrate queue and catch up past-due tasks (respect API rate caps).
- An asleep Sprite **may not run timers**. Only promise proactive off-hours checks if M0 has verified and configured a free external wake scheduler. Otherwise UI says `Checks resume when Aftercare wakes`.
- Trigger from external scheduler only through signed or random high-entropy authorization, request throttling and no public bypass.

## Prompt and model boundaries
- LLM output must conform to discriminated Zod schema, with model version, confidence, provenance pointers and `unknown` values.
- Reject instructions embedded in merchant pages, PDFs, receipts, tool output and redirects. Never allow model text to specify arbitrary tools, recipients, command execution, payment or connector scopes.
- Cite source URLs and observed timestamps in user summaries. Model-written legal claims must be downgraded to a draft requiring verification.

## Example idempotent action protocol
1. Check session, case owner and target approval; verify draft content hash, recipient, channel, expiry, case revision and user revocation.
2. Atomically insert `external_action` with stable key and append audit event.
3. Mark `dispatching` and append `action_attempt` **before** network call.
4. Call verified provider adapter with idempotency key if supported.
5. Persist raw provider ID/status (redacted) and acknowledged state, or `unknown` if response lost.
6. Reconcile unknown before any repeat. Only state `sent/acknowledged` upon trusted remote response.

## Acceptance scenarios
- Two simultaneous workers cannot claim same job.
- Force-kill at each persistence boundary: no duplicated claim or missing outbox event.
- Timeout after provider accepts: state `unknown`, not `failed`; reconciliation handles provider truth.
- Policy source changes after approval: invalidate or re-review if material.
- Duplicate receipt import: review not double-create.
