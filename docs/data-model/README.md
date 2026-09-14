# Production data model (design doc — not executed in the prototype)

These SQL files are the intended Postgres/Supabase schema for District Plans (PRD §6.3) and were
verified end-to-end on Postgres 17 during Phase 1 (schema, RLS, vote/lock invariants — 15 checks).
The prototype deliberately runs on an in-memory store instead (`src/lib/store/`) so it starts with
`npm run dev` and deploys to Vercel with no external services. The store's TypeScript types mirror
these tables one-to-one so the swap back to Postgres is mechanical.

| file | contents |
|---|---|
| `01_core_schema.sql` | users, taste_profiles, social_edges, plans, plan_members, invites, invite_optouts, suggestions, votes, bookings, splits, rides, events (analytics); enums; triggers that reject votes outside `voting` and make analytics append-only |
| `02_inventory.sql` | dining venues + slots, live events, movie showtimes (stub for District's internal inventory) |
| `03_rls_policies.sql` | Row Level Security for anon / authenticated / service_role, with SECURITY DEFINER membership helpers |

Invariants the in-memory store must preserve (and the state-machine tests check):
- one vote per (plan, member), re-castable until lock; votes rejected unless plan is `voting`
- lock is atomic: majority of joined members **and** joined ≥ quorum
- analytics events are append-only
- price quoted at vote == price charged at booking; a failed booking never leaves a charge
