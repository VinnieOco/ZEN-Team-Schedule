#!/usr/bin/env node
/**
 * Database migrations and optional seed.
 *
 *   npm run db:migrate  — pending migrations only (safe for production)
 *   npm run db:setup    — migrate + seed (fresh local dev)
 *   npm run db:seed     — seed only
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

const args = new Set(process.argv.slice(2));
const migrateOnly = args.has("--migrate-only") || args.has("--no-seed");
const seedOnly = args.has("--seed-only");

dotenv.config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

const PLACEHOLDERS = ["your-project", "your-anon", "[YOUR-PASSWORD]", "[project-ref]"];

function isPlaceholder(v) {
  if (!v) return true;
  const s = v.toLowerCase();
  return PLACEHOLDERS.some((p) => s.includes(p));
}

if (!existsSync(envPath)) {
  console.error("\n❌ .env.local not found. Run: cp .env.example .env.local\n");
  process.exit(1);
}

if (isPlaceholder(databaseUrl)) {
  console.error(`
❌ DATABASE_URL is not configured in .env.local

Run the checker first for step-by-step help:
  npm run supabase:check
`);
  process.exit(1);
}

const migrationsDir = join(root, "supabase/migrations");
const seedPath = join(root, "supabase/seed.sql");

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists public._schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
    alter table public._schema_migrations enable row level security;
    revoke all on table public._schema_migrations from anon, authenticated;
    revoke all on table public._schema_migrations from public;
  `);
}

async function runMigrations(client) {
  await ensureMigrationsTable(client);

  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;

  for (const file of migrationFiles) {
    const { rows } = await client.query(
      "select 1 from public._schema_migrations where id = $1",
      [file],
    );
    if (rows.length > 0) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`Running migration ${file}…`);
    const migration = readFileSync(join(migrationsDir, file), "utf8");
    await client.query(migration);
    await client.query("insert into public._schema_migrations (id) values ($1)", [file]);
    console.log(`✓ ${file}`);
    applied += 1;
  }

  return applied;
}

async function runSeed(client) {
  console.log("Running seed…");
  const seed = readFileSync(seedPath, "utf8");
  await client.query(seed);
  console.log("✓ Seed applied");
}

async function printCounts(client) {
  const counts = await client.query(`
    select
      (select count(*)::int from public.employees) as employees,
      (select count(*)::int from public.projects) as projects,
      (select count(*)::int from public.allocation_categories) as categories,
      (select count(*)::int from public.allocations) as allocations
  `);
  const row = counts.rows[0];
  console.log(`
  employees:   ${row.employees}
  projects:    ${row.projects}
  categories:  ${row.categories}
  allocations: ${row.allocations}`);
}

async function run() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  console.log("\nConnecting to database…");
  await client.connect();

  try {
    if (seedOnly) {
      await runSeed(client);
      console.log("\n✅ Seed complete!");
      await printCounts(client);
      return;
    }

    const applied = await runMigrations(client);

    if (!migrateOnly) {
      await runSeed(client);
      console.log("\n✅ Database ready! (migrations + seed)");
      await printCounts(client);
      console.log(`
Next steps:
  1. npm run dev
  2. http://localhost:3000/login → Sign up
`);
      return;
    }

    if (applied === 0) {
      console.log("\n✅ No pending migrations.");
    } else {
      console.log(`\n✅ Applied ${applied} migration(s).`);
    }
    console.log("   (Seed skipped — use npm run db:seed or npm run db:setup to load sample data.)");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("\n❌ Database command failed:", err.message);

  if (err.message.includes("ENOTFOUND") && err.message.includes("supabase")) {
    console.error(`
The database host in DATABASE_URL could not be resolved (common with the direct db.*.supabase.co URL).

Fix:
  1. Supabase Dashboard → Project Settings → Database → Connection string
  2. Choose URI, then Session pooler (IPv4-friendly)
  3. Replace [YOUR-PASSWORD] and paste into DATABASE_URL in .env.local
  4. Run: npm run supabase:check && npm run db:migrate

Also confirm the project is not paused in the dashboard.
`);
  } else if (err.message.includes("Tenant or user not found")) {
    console.error(`
This usually means DATABASE_URL has the wrong project ref or password.

  npm run supabase:check

Use the Direct connection string from Supabase if the pooler URI fails:
  postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
`);
  }

  process.exit(1);
});
