---
name: aftercare-approval-security
description: Use when reviewing authentication, access control, private files, consent, claim approval, external actions, privacy or threat-model-sensitive changes.
---

# Aftercare Approval Security

Read `docs/06-security-privacy.md` and `docs/04-agent-state-machine.md`. Enforce explicit recipient/body/version/expiry bound single-use approvals and revocation. Revalidate immediately before action. Treat uncertain send outcomes as unknown; reconcile, never blindly retry. Test malicious documents, SSRF, prompt injection, cross-user access, CSRF, approval replay, modified draft, duplicate sends, file leaks, log/secret redaction and deletion. Disable consequential sends unless verified adapter and approval checks are operational.

## Output required
Report implemented artifacts, changed files, tests executed, exact remaining risks, and the milestone exit result.
