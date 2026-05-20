-- Internal migration tracker (npm run db:migrate). Not used by the app API.
-- Superseded by 20260520120000_schema_migrations_disable_rls.sql (RLS off + REVOKE).

alter table if exists public._schema_migrations enable row level security;

revoke all on table public._schema_migrations from anon, authenticated;
revoke all on table public._schema_migrations from public;
