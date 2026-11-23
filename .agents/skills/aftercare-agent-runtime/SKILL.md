---
name: aftercare-agent-runtime
description: Use when implementing Aftercare autonomous monitoring, durable job queue, scheduled checks, lifecycle transitions, restart recovery and action reconciliation.
---

# Aftercare Agent Runtime

Read `docs/04-agent-state-machine.md`, `docs/02-system-architecture.md`, `docs/08-test-strategy.md`. Design state transitions before code. Write lease and dedupe tests; persist before remote effects; use job checkpoints and bounded retries. Distinguish asleep Sprite and genuine scheduled wake; do not claim continuous monitoring without verified trigger. Kill processes at transition boundaries and verify safe recovery and no duplicate external sends. Record last/next check and degraded reason.

## Output required
Report implemented artifacts, changed files, tests executed, exact remaining risks, and the milestone exit result.
