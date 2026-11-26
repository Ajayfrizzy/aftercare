# Aftercare from receipt to recovery

Synthetic walkthrough • Willow Stationery • USD 12.45

**1. Keep the original.** A notebook never arrives. Its owner confirms the purchase in Aftercare and keeps the original receipt and packing slip with the record. Receipt suggestions stay editable until confirmation.

**2. Follow the promise.** The synthetic shop promised a refund. Its status changed from processing to disputed, and its due date passed. The journal keeps each source and shows that receipt of the money still needs confirmation.

![The Aftercare journal groups recent purchases, recovery cases, refund commitments and checks needing attention.](evidence/screens/acceptance-overview-after.png)

*Example overview from the local browser regression suite. The figures in the screenshot belong to its separate test fixture.*

**3. Approve one claim.** The owner reviews the delivery case, intended recipient, letter and one selected original receipt. The download contains the approved letter and original bytes. Trying the same authorization again returns HTTP 409. The activity record says exported, with delivery unconfirmed.

**4. Return to the case.** The local worker records a follow-up when the disposable refund deadline comes due. Pending work survives restart. An independent wake of a sleeping private Sprite still needs verification.

The real app can replay this story locally using the [private acceptance journal](owner-acceptance.md). The published walkthrough needs no login or owner narration once its repository is shared.

## Film and transcript

[Watch or download the 3:23 film](aftercare-demo.mp4) · [English WebVTT](aftercare-demo.vtt). The score is an original synthesized instrumental composed for this film. There is no speech or sampled recording. Historical integration results are identified on screen.

**0:00 — Import the original** A synthetic text receipt opens beside its editable purchase fields.

**0:10 — Correct a suggested field** Local extraction recognized the item and amount. The owner adds the notebook’s grid-paper detail.

**0:20 — Workers AI • earlier live upload** In the verified model run, €12.45 became 12 minor units. The owner corrected it to 1245 before confirming.

**0:28 — Confirm, then reload** Saving creates a purchase. Reloading the vault retrieves the confirmed record.

**0:39 — Read the return window** This synthetic policy grants 30 calendar days from November 24 in UTC. The assessment shows when the window closes.

**0:48 — Change the protection filter** The same purchase has a twelve-month warranty. Changing the filter reveals its separate deadline.

**0:57 — Tavily • previously verified** The private Sprite used the official connector for search and extract. Retrieved policies still need an applicability review.

**1:06 — Compare the offer** Price opportunities require comparable evidence. No live qualifying offer has been verified.

**1:13 — Identify the affected unit** Official CPSC notice 26-372 identifies specific serial batches. A matching product name alone remains a candidate.

**1:22 — Spot the missed delivery** The promised delivery date passed. The owner’s evidence records that receipt is still unconfirmed.

**1:31 — Open the resulting case** The worker opened an evidence-linked case. Its source and reason are available alongside the draft.

**1:39 — Edit the claim** The owner adds a concrete request to the letter before saving a new version.

**1:49 — Choose the disclosure** Select original receipt attachments. A redaction changes the letter only. Selected files retain their original bytes.

**2:00 — Review and approve version 2** Review the exact recipient, letter and attachment identities. Approval authorizes one download.

**2:10 — Download the approved claim** The actual JSON download succeeds. The case records exported not sent. The merchant has received no message.

**2:20 — Replay the same approval** The local capture test repeated the export request with the consumed approval. The API rejected it.

**2:27 — Inspect the refund history** Open the revisions to see the earlier processing status and its source. The overdue refund is disputed.

**2:36 — Open the follow-up** The ordinary worker delivered this reminder after the disposable follow-up deadline was advanced.

**2:44 — Read the activity history** The journal records the recovery actions and the unsent export.

**2:52 — Restart recovery • prior live run** The restarted private Sprite served the same purchase and receipt bytes. Independent cold-private-Sprite wake remains unverified.

**3:01 — Application regression** Historical Node test output from the accepted application baseline.

**3:08 — Browser regression** Historical Playwright output from the accepted baseline. The separate owner walkthrough passed all 24 checks.

**3:16 — Production build** The accepted production build completed. The owner controls what leaves the journal.
