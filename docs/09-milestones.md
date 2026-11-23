# Milestones and six-day execution gates

**Hacksgiving begins Monday Nov 23; deadline Sunday Nov 29 before midnight PST.** Target implementation complete by Saturday Nov 28 and reserve Sunday as a submission buffer. Milestones are vertical slices, not permission to omit agreed features.

## M0 — Nov 23: freeze and verify architecture/infrastructure
**Deliverables:** repo/branches/CI, docs and skills checked in, Next/Fastify/SQLite skeleton, authenticated demo landing, genuine Sprite startup, network and connector diagnostics, real Tavily request, inference no-cost check, free-spend check, scheduler wake investigation, UX wireframes/design tokens.
**Exit:** owner approves ADR baseline; CI passes; real connector request logs source; expense explicitly $0; all external blockers documented. **Stop** if unbounded charges or no viable free Sprite access.

## M1 — Nov 24: purchase vault and onboarding
**Deliverables:** auth/sessions, profile/consent, purchase/item CRUD, private file upload, receipt extraction candidate schema and edit-to-confirm studio, searchable vault, polished onboarding and purchase detail, audit.
**Exit:** manual and receipt-import complete from browser; duplicate/incorrect receipts handled; no cross-user access; real model extraction if model gate passed, otherwise clearly gated and manual path preserved.

## M2 — Nov 25: protection intelligence
**Deliverables:** verified Tavily policy research, return/warranty calculation, price checks, official recall source and matching, delivery problem evidence, refund commitments and status, protection cards and urgency center, persisted check queue.
**Exit:** representative case in each of 6 protection types with traceable evidence/uncertainty; working due-time checks; source timestamps; page lists show correct urgency and links.

## M3 — Nov 26: persistent recovery agent
**Deliverables:** durable state machine and leases, issue detection, evidence registry, source-grounded claim draft/versioning, approvals/revocations, authorized adapter/export, action attempts and unknown-state reconciliation, follow-up scheduling, notifications, activity history.
**Exit:** import→issue→claim→approval→action/export→follow-up operates; kill/restart test passes; no duplicate external dispatch; no unauthorized merchant messages.

## M4 — Nov 27: full consumer-grade UI and robust integration
**Deliverables:** detailed designs implemented for all screens (dashboard, imports, purchases, protection, cases, approvals, agent, privacy), mobile nav, dark/light, keyboard/screen reader tests, errors/empty/loading states, connected end-to-end contracts, usage budgets.
**Exit:** measured at widths 360/390/768/1024/1440; screenshots and keyboard walkthrough approved; no generic placeholder surfaces.

## M5 — Nov 28: reliability, red-team and full demonstration
**Deliverables:** tests/security review, evidence matrix, live Sprite connector proof, timed monitoring disclosure, backup/restore drill, incident/runbook, demo fixtures, timed end-to-end recording, README, developer onboarding and public repo prep.
**Exit:** every hard release gate in `08-test-strategy.md` passed or reported as an explicit blocker. No simulated connector mistaken for live.

## M6 — Nov 29: submission, not feature churn
**Deliverables:** verified deployed URL, source link, recorded demo, LinkedIn post tagging @flydotio, short and long description, submission form receipt, final billing check and credentials scan.
**Exit:** organizer submission completed before deadline with links that open without secret access.

## Dependency ordering
M0 external gates -> M1 data/auth -> M2 evidence sources -> M3 workflow/approval -> M4 visual polish/integration -> M5 hardening -> M6 submit. UI tokens/flows start in M0, not postponed entirely to M4. Run smoke checks after every milestone.

## Escalation rule
A blocked partner access or paid gateway is **not** permission to claim a fake live integration or make an unreviewed architecture pivot. Document the feature, verified limitation, safe alternative and proposed change for owner review. Never silently remove agreed scope.
