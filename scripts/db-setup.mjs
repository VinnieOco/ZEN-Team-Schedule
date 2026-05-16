#!/usr/bin/env node
/**
 * Applies supabase/migrations + supabase/seed.sql to your Supabase Postgres database.
 * Run: npm run db:setup
 * First run: npm run supabase:check
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

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

const migrationPath = join(root, "supabase/migrations/20250515000000_initial_schema.sql");
const seedPath = join(root, "supabase/seed.sql");

async function run() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });

  console.log("\nConnecting to database…");
  await client.connect();

  try {
    console.log("Running migration…");
    const migration = readFileSync(migrationPath, "utf8");
    await client.query(migration);
    console.log("✓ Migration applied");

    console.log("Running seed…");
    const seed = readFileSync(seedPath, "utf8");
    await client.query(seed);
    console.log("✓ Seed applied");

    const counts = await client.query(`
      select
        (select count(*)::int from public.employees) as employees,
        (select count(*)::int from public.projects) as projects,
        (select count(*)::int from public.allocation_categories) as categories,
        (select count(*)::int from public.allocations) as allocations
    `);
    const row = counts.rows[0];
    console.log(`
✅ Database ready!

  employees:   ${row.employees}
  projects:    ${row.projects}
  categories:  ${row.categories}
  allocations: ${row.allocations}

Next steps:
  1. npm run dev
  2. http://localhost:3000/login → Sign up
  3. You should see "Connected to Supabase" on the scheduling board
`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);

  if (err.message.includes("Tenant or user not found")) {
    console.error(`
This usually means DATABASE_URL has the wrong project ref or password.

  npm run supabase:check

Use the Direct connection string from Supabase if the pooler URI fails:
  postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
`);
  }

  process.exit(1);
});
