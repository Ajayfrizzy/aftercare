# Design freeze and change control

## Baseline
Product scope chosen; proposed technical baseline in `00-decisions.md` becomes `APPROVED` only after owner review. Codex does not treat a planning document as permission to silently shift tools, UI direction, external integrations or security boundaries.

## Change request template
```
Change ID / date:
Requested by / milestone:
Current ADR / behavior:
Verified reason (security, correctness, external constraint, product requirement):
Alternatives considered:
Chosen change and scope:
UX / data migration / risk impact:
Tests and release gate impact:
Cost impact (must remain $0):
Rollback and recovery:
Owner approval (explicit):
Implementation evidence:
```

## Rules
- Block unapproved changes affecting user promise, architecture, authorization, data schema, connectors, billing or approved feature coverage.
- Bug fixes preserving contracts need tests, not owner approval unless they change an ADR.
- If urgent security vulnerability: stop relevant feature, document and request approval for remediation before re-enabling. Never quietly bypass a protection to meet deadline.
- Decision logs use `ADR-###` with status `proposed/approved/superseded` and linked evidence.
