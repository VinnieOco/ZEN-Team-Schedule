-- Internal migration tracker (npm run db:migrate). Not used by the app API.

alter table if exists public._schema_migrations enable row level security;

-- Block PostgREST / anon / authenticated access; direct DB migrations still work as postgres.
revoke all on table public._schema_migrations from anon, authenticated;
revoke all on table public._schema_migrations from public;
