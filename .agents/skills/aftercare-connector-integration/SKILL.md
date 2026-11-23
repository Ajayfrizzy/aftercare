---
name: aftercare-connector-integration
description: Use when configuring Fly.io Sprite connector access, Tavily web research, CPSC public data, optional inference and approved outbound adapters.
---

# Aftercare Connector Integration

Read `docs/02-system-architecture.md`, `docs/10-deployment-operations.md`, `docs/13-research-links.md`. Verify actual provider/account credentials and costs before enabling. Grant only the designated Sprite, minimal path scope, and keep keys in control plane. Test a real Tavily connector request from inside Sprite and record redacted proof, source URLs and quota. Fake/mock traffic may support unit tests but never satisfy live acceptance. For unavailable merchant adapter, provide explicit export with `exported_not_sent`. Never claim a user action was delivered without an authenticated provider response.

## Output required
Report implemented artifacts, changed files, tests executed, exact remaining risks, and the milestone exit result.
