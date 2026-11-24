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

## Run Aftercare locally

From the repository root, use Node 24.22.1 and pnpm 9.15.9.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://127.0.0.1:3000/vault**. Select **Create an account**, enter an email and a password of at least 12 characters, and select **Create account**. Returning users enter their credentials and select **Sign in**. Use the exact origin above for the session and origin checks.

The launcher starts Next.js on port 3000 and Fastify on loopback port 3101. The API creates and migrates SQLite on startup. Accounts and purchases persist in `apps/api/aftercare.sqlite`; uploads default to `apps/api/private-uploads/`. Ctrl-C stops both processes. Restart after API code changes.

No environment variables are required with the launcher. It sets APP_BASE_URL and generates a temporary DEMO_SECRET. For the separate read-only journal, set DEMO_SECRET to a private password of at least 32 characters before startup and use Basic username demo. SQLITE_PATH and PRIVATE_UPLOAD_DIR accept absolute override paths.

For separate terminals, start the API from the root with `APP_BASE_URL=http://127.0.0.1:3000 pnpm --filter @aftercare/api start` after exporting DEMO_SECRET. Start the frontend with `pnpm --filter @aftercare/web dev --webpack --hostname 127.0.0.1 --port 3000`. Keep both ports free.

The permanent project directory is ~/Desktop/aftercare. The full application runs with pnpm dev. For accounts created in the former M2 worktree, stop the default launcher and run `pnpm dev --m2-data` and open http://127.0.0.1:3120/vault. Both profiles use the same application code and keep their existing local accounts.
