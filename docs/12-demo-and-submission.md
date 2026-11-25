# Hacksgiving demonstration and submission playbook

## Demo story (3–5 minutes)
1. Open branded Aftercare overview in a real browser; show real Sprite URL and agent status.
2. Import **synthetic** receipt, parse/verify product and merchant in receipt studio; avoid real personal information.
3. Show purchase detail: source records, return/warranty deadline, price/recall checks, honest uncertainty.
4. Trigger **live Tavily connector** research inside Sprite, show timestamped source URL and stored evidence.
5. Agent detects pending synthetic refund or delivery issue and creates grounded case with matching supporting artifacts.
6. Show agent drafting a polite follow-up with exact recipient, redactions, source list and approval requirement.
7. Approve; either (a) dispatch through genuinely verified test/sandbox adapter and show provider acknowledgment, or (b) clearly export the claim without alleging it was sent.
8. Force-stop worker/Sprite, wake it, show retained case, persisted attempt/event history and recovered pending job with no duplicated external action.
9. End in polished activity timeline and data/privacy settings; demonstrate mobile width, not only desktop.

## Submission assets
- Public repository created and implemented during Hacksgiving week; README with architecture and setup.
- Accessibly shared deployment and stable demo link.
- Recorded video with real time sources (and explicit labeling for synthetic scenario).
- Social post on **LinkedIn** tagging @flydotio and describing persistent Sprite agent and real connector.
- Short description: `Aftercare is a personal post-purchase protection agent that remembers purchases, verifies policies and safety notices, detects refund/return risks, and guides approved, evidence-backed recovery—persistently on Fly.io Sprites.`
- Submission form by midnight **PST** Nov 29; target completion Nov 28, send early Nov 29. Confirm actual form timezone/availability.

## Integrity checklist
Do not claim recovered funds that were not actually received; distinguish fake merchant dataset from real research; list blocked features honestly; confirm demo links accessible to judges, no leaked credentials, no paywall and no inaccessible private auth gate.

### Automated demo preparation

Fly requires a short demo and code link. Video is optional and does not affect scoring according to the [official submission instructions](https://fly.io/hacksgiving/). The M5 evidence contains the four-minute synthetic storyboard. The full local browser run generates real frames in test-results/design. Codex can assemble these into a captioned sequence in receipt review, purchase detail, protection, case, approval and activity order. Label the records synthetic, cite prior live provider evidence separately, and end on the private wake limitation. No owner recording or narration is needed. Public posting requires separate owner approval.

The synthetic vault demonstration can now show purchase tags and a second original receipt. In the refund view, show a sourced processing update and its owner-reported status. For an email draft, show the intended recipient and unchanged receipt disclosure before approval. Keep the final status exported_not_sent.
