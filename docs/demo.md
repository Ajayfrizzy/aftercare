# Aftercare in one minute

Synthetic walkthrough • Willow Stationery • USD 12.45

**1. Keep the original.** A notebook never arrives. Its owner confirms the purchase in Aftercare and keeps the original receipt and packing slip with the record. Receipt suggestions stay editable until confirmation.

**2. Follow the promise.** The synthetic shop promised a refund. Its status changed from processing to disputed, and its due date passed. The journal keeps each source and shows that receipt of the money still needs confirmation.

![The Aftercare journal groups recent purchases, recovery cases, refund commitments and checks needing attention.](evidence/screens/acceptance-overview-after.png)

*Example overview from the local browser regression suite. The figures in the screenshot belong to its separate test fixture.*

**3. Approve one claim.** The owner reviews the delivery case, intended recipient, letter and one selected original receipt. The download contains the approved letter and original bytes. Trying the same authorization again returns HTTP 409. The activity record says exported, with delivery unconfirmed.

**4. Return to the case.** The local worker records a follow-up when the disposable refund deadline comes due. Pending work survives restart. An independent wake of a sleeping private Sprite still needs verification.

The real app can replay this story locally using the [private acceptance journal](owner-acceptance.md). The published walkthrough needs no login or owner narration once its repository is shared.
