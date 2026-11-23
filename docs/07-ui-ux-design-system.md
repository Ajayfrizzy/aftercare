# UI/UX blueprint — consumer-grade, distinctive, accessible

## Positioning
Not a generic admin template. Visual personality: **calm protection, financial clarity, editorial confidence**. Make Aftercare feel like a personal protection workspace rather than a customer support ticket system. Delight is restrained and purposeful. Product voice: precise, reassuring without exaggeration, clear about uncertainty.

## Brand foundations
- Wordmark: **aftercare** lowercase; abstract protective orbit/receipt-fold mark (custom vector, not a stock shield). Logo can be recreated in SVG; no copyrighted logos.
- Visual motifs: soft elliptical protection rings, subtly offset receipt-paper edges, fine timeline rails, semantic evidence stamps, quiet micro-interactions.
- Colors (initial tokens, verify WCAG): midnight ink `#132235`, deep navy `#172E43`, mineral teal `#147D79` for brand, mint `#E8F7F3` for background accents, off-white `#F7F9F8`, cloud `#EEF2F4`, muted `#5E6D7A`; warning amber `#A5660A`, danger red `#B13B42`. Dark: canvas `#0D1821`, surfaces `#142331`, text `#F0F5F5`.
- Fonts: `Manrope` or `Plus Jakarta Sans` for UI and headings, system fallback; `IBM Plex Mono` for IDs and evidence hashes only. Use self-hosted/free font resources or system fonts.
- Layout: 12-column desktop, max content width 1360px; 240–264px side rail, 24px gutters; tablet 2-column cards; mobile 360–430px single column, sticky bottom nav, contextual action bar.
- Spacing: 4px base with 8/12/16/24/32/48; radii 12 controls, 18 cards, 24 large containers; shadow subtle, 1px keylines, no overwhelming glass effects.
- Motion: 120–220ms transitions, spring only for noncritical affordances; honor `prefers-reduced-motion`.

## Main information architecture
Desktop side rail: `Overview`, `Purchases`, `Protection`, `Cases`, `Agent Activity`; lower: `Settings`, help/account. Top bar: universal search, notification center, avatar. Mobile bottom: `Home`, `Purchases`, `Cases`, `Agent`, with drawer/overflow for `Protection` and `Settings`.

## Screen inventory (complete navigation, not one dashboard)
1. **Landing (public):** premium hero `Your purchases deserve a second look`, three benefits, live mock workflow, trust/privacy statement, CTA. No invented statistics or merchant endorsements.
2. **Onboarding (3 steps):** profile/timezone; data/AI consent; upload first receipt or enter manually. Progress meter, sample preview, exit/restart. Never force personal financial data for demo.
3. **Overview (home):** warm greeting, protected purchase count, `money at stake` **potential/not recovered**, expiring windows, priority action card, upcoming checks, compact latest activity; clearly show monitoring mode and last checked.
4. **Purchases list:** thoughtful cards/table toggle, product image or polished monogram, merchant, purchase date, status, tagged protection; filters (store, protection, risk, date), search, bulk import without fake scanning.
5. **Purchase detail:** big product header, itemized receipt, merchant/order reference, document previews, protection timeline, issue flags, policy evidence links, edit fields and action to open case.
6. **Import studio:** drag-and-drop plus mobile camera/file, upload progress and safety validation, side-by-side receipt viewer + editable extracted fields; confidence chips, missing-field prompts, explicit `Confirm purchase`.
7. **Protection center:** grouped `Needs attention`, `Upcoming deadlines`, `Recalls`, `Price opportunities`, `All protected`; intelligent status descriptions, source confidence and source dates.
8. **Case workspace:** narrative issue summary, monetary exposure, source-backed evidence stack, chronological history, agent hypothesis vs verified facts, next suggested action, user corrections.
9. **Claim composer / approval:** preview exact recipient/channel/subject/body, attach/detach evidence, redaction preview, edit versioning, safety warning, approve/export/execute with explicit state and receipts.
10. **Agent activity:** timeline of checks (real data), expandable reasoning summary, tools used, evidence source, failures/retries, next run; prominent health and pause control. Avoid showing internal private chain-of-thought; provide concise decision rationale instead.
11. **Refund/claim tracking:** promise dates, receipts, outstanding balance (unverified if applicable), follow-up events, awaiting merchant vs awaiting user vs resolved.
12. **Settings and privacy:** locale/timezone, alerts, research consent, file handling, export/delete, linked connector status, spending budget and safety mode.
13. **Demo / product tour:** unmistakably labeled synthetic scenario, guided reset and reproducible demo without fabricated live outcomes.

## Component language
- `ProtectionSummary`, `UrgencyStrip`, `PurchaseTile`, `MerchantAvatar`, `EvidenceSource`, `PolicyConfidence`, `DateWindow`, `RefundTimeline`, `AgentCheckCard`, `ActionApprovalPanel`, `AmountWithStatus`, `ConsentDrawer`, `EmptyJourney`, `RetryBoundary`, `SourceAge`.
- Replace generic priority labels with actionable copy: `Return window closes in 2 days`, `Refund not yet confirmed`, `Recall may affect this item`, `Check policy before asking for adjustment`.
- Semantic urgency with icon/text plus color (never color alone); support offline/error/skeleton/empty/success/partial data/expired-source/awaiting-approval states everywhere.

## Design acceptance review
- At 360, 390, 768, 1024 and 1440px: no horizontal overflow, nav coherent, long merchant names and documents handled, empty/loading/errors intentional.
- Keyboard-only critical paths: import, confirm, filter, case, edit draft, approve, revoke, export, settings. Focus restore after dialogs, live region feedback, tab order.
- Automated accessibility audits plus manual screen-reader spot checks. Contrast WCAG AA, touch 44×44, text zoom 200%.
- Visually inspect screens, not just unit test. No placeholder chart widgets, random gradients, fake “$ saved” totals, stock UI screen as final.
- Produce 3–5 reference screenshots and annotated UX decisions in evidence folder before completing M4.

## Primary storyboard
Overview urgency card -> Purchase detail -> Evidence section -> Case workspace -> Draft approval -> Export or verified dispatch -> Activity timeline. Each route has clear breadcrumbs/back affordance and meaningful mobile behavior.
