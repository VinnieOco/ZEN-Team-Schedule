-- Internal migration tracker (npm run db:migrate). Not exposed via PostgREST.
-- RLS with zero policies triggers Supabase Security Advisor; API access is already
-- blocked with REVOKE on anon, authenticated, and public.

alter table if exists public._schema_migrations disable row level security;

revoke all on table public._schema_migrations from anon, authenticated;
revoke all on table public._schema_migrations from public;
