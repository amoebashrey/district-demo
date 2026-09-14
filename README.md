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

## Demo flow
1. `/switch` — pick a synthetic person (grouped by city; friends share a crew).
2. **Start a plan** — date window, vibe, budget, "lock when N are in".
3. Plan hub — **+ Invite**: copy the share link or pick friends from contacts. **Open voting** generates 2–3 nights.
4. Open the share link in a private window → join as a guest with just a name → vote.
5. Switch back, vote. Majority + quorum → plan locks itself. Late votes are rejected.
6. Edge cases: leave after lock (quorum re-check), expiry with re-open, cancel, report as spam (opt-out).

## Layout
```
src/app/                    screens: / (your plans) · /switch · /plans/new · /plans/[id] · /join/[token]
src/app/api/                route handlers — the backend surface (plans, vote, invite, respond, join, session, optout, health)
src/lib/services/           plan.ts (state machine + atomic lock) · invite.ts (links, caps, opt-out) · candidates.ts (rules-based options) · analytics.ts
src/lib/store/              in-memory store + domain types mirroring docs/data-model
src/lib/theme/tokens.ts     District brand tokens (verified from district.in production CSS)
src/components/             UI kit (Screen, Button, Chip, Card, Pill, Avatar…) + client helpers (api, LiveRefresh, toast)
scripts/fixtures/           deterministic synthetic-data generator → fixtures/out/ (SYNTHETIC)
scripts/test/               node:test suites
docs/DESIGN_LANGUAGE.md     what District actually ships vs the PRD's provisional tokens
docs/data-model/            production Postgres schema + RLS (design doc, not executed)
```

## State machine
`draft → voting → locked → booked → completed`, plus `cancelled` / `expired` from any pre-booked state,
`expired → voting` (re-open) and `locked → voting` (quorum broken when a member leaves).
Lock rule: leading option has a strict majority of joined members' votes **and** joined ≥ quorum.
Votes are one per member, re-castable until lock, rejected after. Expiry is evaluated lazily on read.

## Deploy
`vercel` (or import the repo in the Vercel dashboard). No env vars required. State is per server
instance and resets on cold start — expected for a demo, and why the real data model is Postgres.

## Phase status
- [x] Phase 0 — scaffold, theme tokens, fixtures
- [x] Phase 1 — data model designed + verified on Postgres, then **moved to design docs**; runtime is the in-memory store
- [x] Phase 2 — plan lifecycle: create → invite (link + contacts) → vote → auto-lock, expiry, cancel, leave, opt-out; all screens
- [ ] Phase 3 — curation: group taste aggregation + Claude assembly with rationale + availability/budget guardrails + browse fallback
- [ ] Phase 4 — booking + split with mock payments, refund rules
- [ ] Phase 5 — analytics view, experiment flag, metrics (NSM + guardrails)
- [ ] Phase 6 — ride, second category, saved crews (P1)

Not used: `district0x/*` (unrelated archived web3 code).
