---
name: aftercare-qa-evidence
description: Use when validating Aftercare milestones, unit and integration tests, browser walkthroughs, safety claims, recovery and release evidence.
---

# Aftercare Qa Evidence

Read `docs/08-test-strategy.md`, `docs/09-milestones.md`. Build requirement-linked evidence matrix with exact commands, commits, environment and pass/fail counts. Run unit/DB/API/E2E/accessibility/security and live connector tests appropriate to milestone. Explicitly mark mocked vs live, synthetic vs real and blocked vs passed. Prioritize idempotency, policy hallucination, fraud-like claims, connector downtime, cost limits, Sprite sleep and crash recovery. Do not report any test as passed unless executed and witnessed.

## Output required
Report implemented artifacts, changed files, tests executed, exact remaining risks, and the milestone exit result.
