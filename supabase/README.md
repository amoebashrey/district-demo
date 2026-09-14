# Supabase

Phase 1 puts migrations in `migrations/` and a seed loader in `seed/` that reads `fixtures/out/*.json`.

Project setup (blocked in Phase 0 — needs the user):
1. Create a project at supabase.com (region: ap-south-1 Mumbai recommended).
2. Copy Project URL, anon key, service-role key and the Postgres connection string into `.env.local`.
3. Or authenticate the Supabase MCP connector in this session (`/mcp` → "claude.ai Supabase") so the build agent can create it.

Neither the Supabase CLI nor Docker is installed on this machine, so local Postgres is not an option without installing them.
