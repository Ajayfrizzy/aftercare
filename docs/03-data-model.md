# Relational data model (SQLite, exact schema to encode in migrations)

## Shared conventions
- IDs: UUIDv7 or UUID strings generated server-side; `created_at`/`updated_at` ISO UTC with DB constraints; money as currency ISO 4217 + **integer minor units stored as decimal TEXT** to support exact integer arithmetic without JS precision loss.
- User-ownership FK: all user-data tables have `user_id`, indexed and checked in service queries. Sensitive columns minimized; no card data.
- An audit record is append-only from app level, with sequence and chained hashes for tamper evidence (not independently immutable).

## Tables and core columns
| Table | Columns | Core indexes/constraints |
|---|---|---|
| `users` | id, email, password_hash, verified_at, status, locale, timezone, currency, consent_version, created_at | email normalized unique |
| `sessions` | id, user_id, token_hash, expires_at, revoked_at, last_seen_at | token_hash unique, user FK |
| `merchants` | id, user_id, normalized_name, domain, country_code, support_contacts_json | `(user_id, normalized_name, domain)` dedupe |
| `purchases` | id, user_id, merchant_id, order_ref, purchased_at, total_minor_text, currency, status, source, confirmed_at | `(user_id, merchant_id, order_ref)` partial unique when present |
| `purchase_items` | id, user_id, purchase_id, product_name, brand, model, sku, serial_encrypted, qty, unit_minor_text, currency | purchase FK, `(user_id,purchase_id)` |
| `artifacts` | id, user_id, purchase_id?, case_id?, blob_key, mime, byte_size, sha256, kind, pii_class, uploaded_at | unique `(user_id,sha256,kind)` review duplicates |
| `extraction_runs` | id, user_id, artifact_id, model, status, raw_candidates_json, validated_json, confidence, error_code | input FK, status |
| `observations` | id, user_id, source_type, source_url?, retrieved_at, valid_until?, jurisdiction?, merchant_id?, product_id?, extract_json, hash, confidence | `(user_id,source_url,retrieved_at)`, hash dedupe |
| `policy_rules` | id, user_id, merchant_id, observation_id, rule_type, scope_json, window_days?, starts_at_rule, verified_status, policy_version | observation FK, no source-less 'verified' |
| `protection_windows` | id, user_id, purchase_item_id, policy_rule_id?, kind, start_at, expires_at, calculated_at, certainty | expires_at index |
| `price_checks` | id, user_id, item_id, source_observation_id, comparable, match_reason, price_minor_text, currency, checked_at | `(user_id,item_id,checked_at)` |
| `recall_matches` | id, user_id, item_id, agency, recall_id, source_observation_id, match_level, user_confirmed, status | unique `(item_id,agency,recall_id)` |
| `deliveries` | id, user_id, purchase_id, tracking_ref?, expected_at?, observed_at?, user_confirmed_at?, status, source_observation_id? | purchase FK |
| `refunds` | id, user_id, purchase_id, case_id?, promised_minor_text, currency, promised_at?, expected_at?, status, verified_by, receipt_artifact_id? | purchase FK; status guarded |
| `cases` | id, user_id, purchase_id, item_id?, type, title, state, severity, detected_at, due_at?, source_level, assigned_run_id?, closed_at? | `(user_id,state,due_at)` |
| `case_evidence` | id, user_id, case_id, artifact_id?, observation_id?, evidence_role, note, included_at | case FK, one of artifact/observation required |
| `claim_drafts` | id, user_id, case_id, version, recipient, channel, subject, body, body_sha256, source_manifest_json, status | unique `(case_id,version)` |
| `approvals` | id, user_id, claim_draft_id, action_type, scope_hash, expires_at, approved_at?, revoked_at?, status | unique approved scope per version |
| `external_actions` | id, user_id, case_id, draft_id, approval_id, adapter, idempotency_key, state, provider_receipt?, remote_ref?, last_attempt_at? | idempotency_key unique |
| `action_attempts` | id, action_id, attempt_no, started_at, completed_at?, request_hash, response_status?, response_redacted?, outcome | unique `(action_id,attempt_no)` |
| `jobs` | id, user_id, kind, subject_type, subject_id, dedupe_key, state, next_run_at, lease_owner?, lease_until?, attempts, max_attempts, last_error_code?, payload_json | active dedupe `(user_id,dedupe_key)` conditional; due index |
| `agent_runs` | id, user_id, trigger, state, started_at, completed_at?, checkpoint_json, work_units, connector_calls, model_calls, cost_estimate | status+time |
| `notifications` | id, user_id, case_id?, kind, title, message, read_at?, created_at, urgency | unread index |
| `activity_events` | id, user_id, aggregate_type, aggregate_id, actor_type, action, metadata_redacted_json, occurred_at, previous_hash, event_hash | `(user_id,occurred_at)` |
| `user_settings` | user_id, email_notify_opt_in, research_consent, locale, timezone, poll_frequency, budget_cap, updated_at | one per user |

## Enumerated state examples
- `cases.state`: `open | investigating | action_ready | awaiting_approval | executing | awaiting_response | resolved | closed_no_recovery | disputed`.
- `external_actions.state`: `prepared | approved | dispatching | acknowledged | exported_not_sent | unknown | failed | cancelled`.
- `jobs.state`: `queued | leased | succeeded | retry_wait | dead_letter | cancelled`.
- `policy_rules.verified_status`: `source_confirmed | provisional | conflicting | stale | unsupported`.

## Integrity requirements
- Strict FK enforcement; cross-user artifact/case references disallowed through service and DB constraints/trigger tests; fields encrypted at application layer where justified.
- Transactions: create case+evidence+event atomically; authorize+record action atomically; lease jobs with atomic compare-and-swap; event chained per-user.
- Purge request cascades private artifacts, user content, sessions, and derived embeddings/summaries; aggregate non-identifying system metrics only after consent.
- Migration fixtures: empty DB, populated upgrade, backward-compat read, failure midway recovery.
