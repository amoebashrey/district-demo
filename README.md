# District Plans — prototype

Group going-out coordination inside District: one person starts a plan, District proposes taste-matched
nights, everyone votes in one tap, majority + quorum locks it, and booking / bill-split / ride follow.
Spec: the PRD (v1.0, Sept 2026). Built phase by phase, status report after each.

**Zero infrastructure.** The app runs on an in-memory store seeded from synthetic fixtures. `npm run dev`
is all it needs, and it deploys to Vercel as a link with no external services. The production data model
(Postgres schema + RLS, verified on Postgres 17) lives in `docs/data-model/` as a design doc.

## Run
```bash
npm install
npm run dev            # http://localhost:3000 (or -p 3100)
npm test               # 10 state-machine tests (lock, votes, invites, expiry)
npm run typecheck && npm run lint && npm run build
npm run fixtures       # regenerate synthetic seed data → fixtures/out/
```
Optional `.env.local`: `ANTHROPIC_API_KEY` for the LLM rationale (Phase 3). Everything else is mocked.

## Movie flow (visual parity pass, Sept 18)
Home → Explore grid → **In the spotlight** posters → movie detail (hype row, offers strip, cast, critics, white **Book tickets** pill
+ EP2 **Go together**) → showtimes (date tabs, cinema cards, ₹-onwards chips) → **Review your booking** (countdown, EP3 **Split & invite**,
payment summary, District Money, white **Pay now**) → confirmation (EP4). First visit shows an intro card with **Take the tour** (6 steps).
Reference screenshots: `public/brand/reference/`. Theme: `#0a0b0d` ground, `#141416` cards, white pill CTAs; purple only for offers, accents
and the highlighted entry points (dim ring + sweeping lavender hotspot; static outline under reduced motion).

## Demo flow (in-flow integration map)
The plan layer now lives inside a recreated District shell. Toggle **Highlight my additions** (top bar) to mark the
six proposed entry points with a rotating purple border and number.
1. `/switch` → pick a Bengaluru person → **For You** feed.
2. Toggle **Highlight my additions**. EP1 card (top), EP2 "Go together" on every item.
3. Tap a glowing **Go together** → detail → checkout with **Split & invite** (EP3) on → **Plan with crew**.
4. Plan hub opens with the invite sheet: **Share on WhatsApp** / copy link.
5. Open the link in a private window → join as a guest (name only) → **Pay via Splitpay**.
6. Back as the organiser → pay your share → plan **auto-books** when everyone has paid → shared plan card
   (when, where, who paid, directions) + EP5 **Plan the next one**. EP6 lives in Profile → Your Plans.
Also: **Book** solo → confirmation → EP4 "Invite the crew to join this booking" turns it into a plan.

## Original open-vote flow
1. `/switch` — pick a synthetic person (grouped by city; friends share a crew).
2. **Start a plan** — date window, vibe, budget, "lock when N are in".
3. Plan hub — **+ Invite**: copy the share link or pick friends from contacts. **Open voting** generates 2–3 nights.
4. Open the share link in a private window → join as a guest with just a name → vote.
5. Switch back, vote. Majority + quorum → plan locks itself. Late votes are rejected.
6. Edge cases: leave after lock (quorum re-check), expiry with re-open, cancel, report as spam (opt-out).

## Layout
```
src/app/                    District shell: / (For You) · /events /movies /dining (+ /[id] detail+checkout) · /confirmation/[id] · /profile
                            Plans layer: /plans/starter (EP1) · /plans/new · /plans/[id] (hub: invite · Splitpay · booked card) · /join/[token] · /switch
src/components/shell/       nav, top bar, feed cards, detail/checkout shell · highlight.tsx = "Highlight my additions" + EntryPoint
src/app/api/                route handlers — the backend surface (plans, vote, invite, respond, join, session, optout, health)
src/lib/services/           plan.ts (open + anchored plans, lock, pay-share, re-plan) · invite.ts · candidates.ts · split.ts (Splitpay) · booking.ts (atomic book + refund) · inventory.ts · analytics.ts
src/lib/providers/          payments.ts — provider interface + mock (refs ending "-fail" decline)
src/lib/store/              in-memory store + domain types mirroring docs/data-model
src/components/ui/          shadcn/ui (radix-nova preset, neutral, dark) — button, card, badge, avatar, tabs, toggle-group, drawer, dialog, alert, progress, sonner…
src/components/screen.tsx   phone-width page shell · client.tsx: api(), LiveRefresh, ActionButton
scripts/fixtures/           deterministic synthetic-data generator → fixtures/out/ (SYNTHETIC)
scripts/test/               node:test suites
docs/DESIGN_LANGUAGE.md     District's real brand values (for later); UI currently uses shadcn defaults, minimal branding
docs/reference/             district-tokens.reference.ts — brand tokens parked until branding is revisited
docs/data-model/            production Postgres schema + RLS (design doc, not executed)
```

## State machine
`draft → voting → locked → booked → completed`, plus `cancelled` / `expired` from any pre-booked state,
`expired → voting` (re-open) and `locked → voting` (quorum broken when a member leaves).
Lock rule: leading option has a strict majority of joined members' votes **and** joined ≥ quorum.
Votes are one per member, re-castable until lock, rejected after. Expiry is evaluated lazily on read.

## UI
shadcn/ui components only (`npx shadcn add …` to extend), default neutral palette in dark mode, Geist. Branding is
intentionally minimal for now; District's verified brand values are parked in `docs/`.

## Deploy
`vercel` (or import the repo in the Vercel dashboard). No env vars required. State is per server
instance and resets on cold start — expected for a demo, and why the real data model is Postgres.

## Phase status
- [x] Phase 0 — scaffold, theme tokens, fixtures
- [x] Phase 1 — data model designed + verified on Postgres, then **moved to design docs**; runtime is the in-memory store
- [x] Phase 2 — plan lifecycle: create → invite (link + contacts) → vote → auto-lock, expiry, cancel, leave, opt-out; all screens
- [ ] Phase 3 — curation: group taste aggregation + Claude assembly with rationale + availability/budget guardrails + browse fallback
- [x] Phase 4 — Splitpay shares + atomic booking with auto-refund (anchored plans book when everyone has paid)
- [x] In-flow integration: District shell with EP1–EP6 and the highlight toggle
- [ ] Phase 5 — analytics view, experiment flag, metrics (NSM + guardrails)
- [ ] Phase 6 — ride, second category, saved crews (P1)

Not used: `district0x/*` (unrelated archived web3 code).
