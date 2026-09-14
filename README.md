# District Plans — prototype

Group going-out coordination inside District: one person starts a plan, District proposes taste-matched
nights, everyone votes in one tap, majority + quorum locks it, and booking / bill-split / ride follow.
Full spec: the PRD (v1.0, Sept 2026). Build proceeds phase by phase with a status report after each.

## Stack
Next.js 16 (App Router, TypeScript, Tailwind v4) · Supabase Postgres + RLS · Claude API (curation) ·
mocked payments / ride / ticketing / notifications behind interfaces.

## Run
```bash
cp .env.example .env.local   # fill Supabase + Anthropic keys
npm install
npm run fixtures             # regenerate synthetic seed data → fixtures/out/
npm run dev                  # http://localhost:3000
npm run typecheck && npm run lint && npm run build
```

## Layout
```
src/app/                 routes (Phase 0: theme smoke page only)
src/lib/theme/tokens.ts  District brand tokens — single source of truth (verified vs provisional marked)
src/lib/fixtures/        shared types for seed data
scripts/fixtures/        deterministic synthetic-data generator
fixtures/out/            generated seed JSON (SYNTHETIC — see README inside)
docs/DESIGN_LANGUAGE.md  what District actually ships (extracted from production CSS) vs the PRD's guesses
supabase/                migrations + seed (Phase 1)
```

## Phase status
- [x] Phase 0 — scaffold, theme tokens, fixtures. Supabase cloud project **pending credentials**.
- [ ] Phase 1 — data layer (schema, RLS, migrations, seed)
- [ ] Phase 2 — plan lifecycle (create → invite → vote → auto-lock) + screens
- [ ] Phase 3 — curation (rules → group aggregation → LLM assembly)
- [ ] Phase 4 — booking + split with mock payments, refund rules
- [ ] Phase 5 — analytics events, experiment flag, metrics view
- [ ] Phase 6 — ride, second category, saved crews (P1)

Not used: `district0x/*` (unrelated archived web3 code).
