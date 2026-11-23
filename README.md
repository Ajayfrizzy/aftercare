# Aftercare — Hacksgiving 2026 implementation blueprint

**Status:** Proposed architecture baseline for owner sign-off (not deployed or executed). **Date:** 2026-11-23. **Product:** A persistent, personal post-purchase protection and recovery agent. **Competition window:** 2026-11-23 to 2026-11-29, midnight PST deadline. **Hard constraint:** Zero personal out-of-pocket spending.

## How to use this bundle
1. Copy these files to the **root of a new Aftercare repository created during Hacksgiving week**, preserving hidden `.agents/skills` directories. Do **not** use the ZIP as an already implemented application: it is a specification and agent-instruction starter.
2. Read `AGENTS.md` and `docs/00-decisions.md`. Sign off or amend provisional decisions before code generation.
3. Execute the read-only M0 discovery gates in `docs/09-milestones.md`, especially Fly billing, Tavily, actual model availability, and wake scheduling. Never commit credentials.
4. In Codex, ask: **“Read AGENTS.md and the architecture/skills. Implement M0 only, run the M0 acceptance tests, report evidence and blockers; do not proceed to M1 or change architecture.”**
5. Advance milestones only after reviewing objective evidence. Every change requires `docs/11-change-control.md`.

## Document map
- `docs/00-decisions.md` — locked proposals, pending external validations, non-goals
- `docs/01-product-requirements.md` — scenarios, user stories, all features, acceptance criteria
- `docs/02-system-architecture.md` — runtime and integration design
- `docs/03-data-model.md` — relational entities, constraints, indexing
- `docs/04-agent-state-machine.md` — durable workflows, scheduling, idempotency
- `docs/05-api-contracts.md` — HTTP boundaries and contracts
- `docs/06-security-privacy.md` — threats, approvals, safety, privacy
- `docs/07-ui-ux-design-system.md` — complete visual identity, IA, screens and states
- `docs/08-test-strategy.md` — CI, adversarial, live, accessibility, recovery testing
- `docs/09-milestones.md` — six-day plan with hard gates
- `docs/10-deployment-operations.md` — Sprite deployment, billing, operational recovery
- `docs/11-change-control.md` — decision-change record and template
- `docs/12-demo-and-submission.md` — end-to-end live demo, evidence, submission
- `docs/13-research-links.md` — official grounding and unverified assumptions
- `.agents/skills/*/SKILL.md` — reusable, focused Codex workflows

**Evidence labels:** `PROPOSED` means specification only; `VERIFIED` needs an actual command/test artifact; `BLOCKED` means unresolved. Demo fixtures must be plainly marked synthetic.

## Local M0 demo

Use Node 24.22.1 and pnpm 9.15.9. Run `pnpm install --frozen-lockfile`, then `pnpm typecheck`, `pnpm test`, and `pnpm build`.
Set DEMO_SECRET to a private, randomly generated password of at least 32 characters in the API environment.
Start `pnpm --filter @aftercare/api start` and, in another terminal, `pnpm --filter @aftercare/web start --hostname 127.0.0.1`.
Open localhost:3000 and select Open private demo. Enter username demo and the configured password.
This read-only local preview contains a synthetic journal. Account registration belongs to M1.
