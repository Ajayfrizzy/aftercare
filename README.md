# Aftercare

A receipt usually lands in one inbox, a return policy lives on another site, and a promised refund can slip past its due date. Aftercare keeps the purchase, the evidence and the next decision together in a private journal. When a delivery is overdue, you can trace the case back to the original receipt, correct the facts, review the proposed letter and export exactly what you approved.

**Watch the 3:23 synthetic product film** · [Download MP4](docs/aftercare-demo.mp4) · [Illustrated walkthrough and transcript](docs/demo.md) · [English captions](docs/aftercare-demo.vtt)

## From receipt to recovery

1. Register, choose regional settings and decide whether to allow receipt extraction and external research.
2. Import a receipt or enter a purchase. Consented plain-text uploads can produce editable Workers AI candidates. During a real upload the model read EUR 12.45 as 12 minor units. The owner corrected it to 1245. The journal retained the prediction and the correction. On macOS with Swift installed, Aftercare reads embedded PDF text and uses Apple Vision for scanned pages and JPG/PNG photos. If Workers AI supplies no candidates, local rules suggest recognizable printed fields for review. The deployed Linux Sprite uses manual review for images and PDFs. The Apple extraction path is available locally on macOS. PDFs are limited to 12 pages and extraction to 8,000 characters.
   Tag purchases and attach additional original receipts from purchase details. Refund revisions retain the previous source and recorded state. Owner confirmation is separate from trusted settlement evidence.
3. Track return and warranty windows, comparable prices, recalls, deliveries and refund promises. Review source URLs, observation times and uncertainty before acting. A merchant promise alone cannot establish that money reached your account.
4. Review an evidence-linked recovery case. Select receipts, inspect the recipient and letter redactions, then authorize a specific draft. Receipt attachments retain their original bytes. Text, JSON, PDF and email-draft exports consume a single approval and record `exported_not_sent`.
5. Inspect follow-ups and audit history in the activity view. Overdue work catches up after wake. Independent scheduled wake of a cold private Sprite remains a mandatory release blocker.

## Inside the application

The Next.js frontend talks to an owner-scoped Fastify API. A single writable SQLite database holds purchases, observations, job leases, drafts, approvals and audit events. Private receipt files retain their byte identities. The worker checkpoints progress and uses durable deduplication across restarts. Session checks, origin checks, private receipt routes and content-bound approvals protect the transition from a model suggestion to an owner action.

| Integration | Demonstrated behavior |
|---|---|
| Fly.io Sprites | Real API and worker execution, persistent receipt storage and operator-triggered cold recovery |
| Tavily | Live search and extraction through a default-deny Sprite grant scoped to the two required endpoints. A retrieved policy still requires an applicability judgment. |
| Workers AI | Genuine consented text receipt upload. Merchant website extraction has local regression coverage only. Manual review remains available when inference fails. |
| US CPSC | Official notices with retrieval times. Recall 26-372 has model and serial-batch evaluation. Generic product-name matches remain candidates. |

The release evidence includes private Sprite execution, connector observations, corrected inference, single-use export and an offline restore drill using two synthetic owners. The audit chain detects changes relative to its stored head. A database writer can reconstruct it. The owner passed all 24 local acceptance checks. Independent private wake remains open. [M5 evidence](docs/evidence/M5.md) · [Architecture decisions](docs/00-decisions.md) · [Product scope](docs/01-product-requirements.md)

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

For an occupied port, follow the [local port troubleshooting steps](docs/10-deployment-operations.md#local-port-troubleshooting).

### Existing owner accounts in the legacy profile

The permanent owner checkout is ~/Desktop/aftercare. The full application runs with pnpm dev. For accounts created in the former M2 worktree, stop the default launcher and run `pnpm dev --m2-data` and open http://127.0.0.1:3120/vault. Both profiles use the same application code and keep their existing local accounts.

## Local owner acceptance

Mobile and desktop browser checks cover tag edits, search after reload, additional original receipts, duplicate handling and private access. Refund revision history shows prior states and citations. TXT, JSON, PDF and unsent EML exports were inspected locally. Comparable-price rules have fixture coverage. A live comparable offer, trusted settlement confirmation and independent private scheduled wake remain open. See the [final verification matrix](docs/evidence/M5.md).

The accepted runtime baseline is `3128f7d`, with 31 application tests and 20 browser tests passed. [Short illustrated demo](docs/demo.md) · [Release inventory](docs/evidence/M6.md)

### Try the private acceptance journal

Install Google Chrome for this headed Playwright session. Run `pnpm acceptance` to explore a signed-in synthetic purchase, disputed refund and attachment-bearing approval in the real app. The temporary session uses a separate SQLite journal and receipt directory. Follow the [three-step owner walkthrough](docs/owner-acceptance.md) and use Resume to finish.

## Private deployment and evidence

The verified release runs on a private, admin-only Sprite. Judges can follow the film and illustrated walkthrough once the repository is published. The journal API listens on loopback behind the frontend. [System architecture](docs/02-system-architecture.md) · [Private operations and storage](docs/10-deployment-operations.md) · [Milestone evidence index](docs/evidence/README.md)
