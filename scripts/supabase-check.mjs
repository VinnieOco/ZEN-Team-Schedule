#!/usr/bin/env node
/**
 * Validates .env.local and tests Supabase + database connectivity.
 * Run: npm run supabase:check
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

const PLACEHOLDERS = [
  "your-project",
  "your-anon-key",
  "[YOUR-PASSWORD]",
  "[project-ref]",
  "PASTE_ANON",
];

function validateDatabaseUrl(dbUrl, apiUrl) {
  const issues = [];
  if (!dbUrl) return issues;
  const lower = dbUrl.toLowerCase();
  if (lower.includes("your_project_ref") || lower.includes("[project-ref]")) {
    issues.push('DATABASE_URL still contains placeholder "YOUR_PROJECT_REF" or "[project-ref]"');
  }
  if (dbUrl.includes("[") || dbUrl.includes("]")) {
    issues.push(
      "DATABASE_URL contains [brackets] — remove them. Password and user must not be wrapped in [ ].",
    );
  }
  if (/postgres\.https?:\/\//i.test(dbUrl)) {
    issues.push(
      'DATABASE_URL username is wrong — use postgres.YOUR_REF only (not postgres.https://...).',
    );
  }
  try {
    const u = new URL(dbUrl);
    const user = decodeURIComponent(u.username);
    const refFromApi = apiUrl ? new URL(apiUrl).hostname.split(".")[0] : null;
    if (refFromApi && user.startsWith("postgres.") && !user.includes(refFromApi)) {
      issues.push(
        `DATABASE_URL username is "${user}" but API URL ref is "${refFromApi}" — they must match (use postgres.${refFromApi}).`,
      );
    }
  } catch {
    issues.push("DATABASE_URL is not a valid URL");
  }
  return issues;
}

function isPlaceholder(v) {
  if (!v) return true;
  const s = v.toLowerCase();
  return PLACEHOLDERS.some((p) => s.includes(p));
}

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("\n❌ .env.local not found\n");
    console.log("Create it with:\n  cp .env.example .env.local\n");
    process.exit(1);
  }
  dotenv.config({ path: envPath });
}

function checkEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const db = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  console.log("\n📋 Checking .env.local\n");

  let ok = true;

  if (isPlaceholder(url)) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_URL — still a placeholder");
    ok = false;
  } else {
    console.log("  ✓ NEXT_PUBLIC_SUPABASE_URL");
    try {
      const host = new URL(url).hostname;
      const ref = host.split(".")[0];
      console.log(`      Project ref: ${ref}`);
    } catch {
      console.log("  ⚠ URL format looks invalid");
      ok = false;
    }
  }

  const keyLooksJwt = key.startsWith("eyJ");
  const keyLooksPublishable = key.startsWith("sb_publishable_");

  if (isPlaceholder(key)) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY — missing or placeholder");
    console.log("      Paste the anon public JWT from Project Settings → API (starts with eyJ)");
    ok = false;
  } else if (!keyLooksJwt && !keyLooksPublishable) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY — wrong value");
    console.log("      In Project Settings → API, copy \"anon\" \"public\" — it is a long JWT starting with eyJ");
    console.log("      (Do not use a random UUID or the service_role key.)");
    ok = false;
  } else {
    console.log("  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (isPlaceholder(db)) {
    console.log("  ❌ DATABASE_URL — still a placeholder");
    ok = false;
  } else {
    console.log("  ✓ DATABASE_URL (present)");
    const dbIssues = validateDatabaseUrl(db, url);
    for (const msg of dbIssues) {
      console.log(`  ❌ ${msg}`);
      ok = false;
    }
    // Check username matches project ref
    try {
      const u = new URL(db);
      const user = decodeURIComponent(u.username);
      const apiRef = new URL(url).hostname.split(".")[0];
      if (user.includes(".") && !user.includes(apiRef) && !isPlaceholder(url)) {
        console.log(
          `  ⚠ DATABASE_URL user "${user}" may not match project ref "${apiRef}"`,
        );
        console.log("      Username should be: postgres." + apiRef);
      }
    } catch {
      /* ignore parse errors */
    }
  }

  return ok;
}

async function testDatabase() {
  const db = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (isPlaceholder(db)) return false;

  console.log("\n🔌 Testing database connection…\n");

  const client = new pg.Client({
    connectionString: db,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    const res = await client.query("select current_database() as db, version()");
    console.log("  ✓ Connected to Postgres");
    console.log(`      Database: ${res.rows[0].db}`);
    await client.end();
    return true;
  } catch (err) {
    console.log("  ❌ Database connection failed");
    console.log(`      ${err.message}\n`);

    if (err.message.includes("Tenant or user not found")) {
      console.log("  💡 Fix “Tenant or user not found”:");
      console.log("     1. Supabase Dashboard → Project Settings → Database");
      console.log("     2. Copy connection string → URI (Session mode)");
      console.log("     3. Replace [YOUR-PASSWORD] with your database password");
      console.log("     4. Username must be postgres.YOUR_PROJECT_REF");
      console.log("        (ref = subdomain from https://YOUR_REF.supabase.co)");
      console.log("     5. If password has special chars (@ # %), URL-encode them");
      console.log("\n     Or try Direct connection (not pooler):");
      console.log("        postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres\n");
    } else if (err.message.includes("password authentication failed")) {
      console.log("  💡 Wrong database password. Reset it in:");
      console.log("     Project Settings → Database → Reset database password\n");
    }

    return false;
  }
}

async function testSupabaseApi() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (isPlaceholder(url) || isPlaceholder(key)) return false;

  console.log("\n🌐 Testing Supabase API…\n");

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    // /rest/v1/ alone often returns 401 even with a valid anon key; probe a real table instead.
    const res = await fetch(`${url}/rest/v1/employees?select=id&limit=1`, { headers });
    if (res.ok) {
      console.log("  ✓ Supabase API reachable (anon key accepted)");
      return true;
    }

    const authHealth = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
    if (authHealth.ok) {
      console.log("  ⚠ REST query failed but Auth API responded — check RLS or table name");
      console.log(`      REST status: ${res.status}`);
      return false;
    }

    console.log(`  ❌ Supabase API returned ${res.status}`);
    if (res.status === 401) {
      console.log("      Re-copy the anon public key from Project Settings → API (same project as the URL).");
      console.log("      Do not use service_role. If you rotated JWT secrets, paste the new anon key.");
    }
    return false;
  } catch (err) {
    console.log(`  ❌ Supabase API failed: ${err.message}`);
    return false;
  }
}

async function checkTables() {
  const db = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (isPlaceholder(db)) return;

  const client = new pg.Client({
    connectionString: db,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query(`
      select exists (
        select from information_schema.tables
        where table_schema = 'public' and table_name = 'employees'
      ) as has_schema
    `);
    await client.end();

    console.log("\n📦 Database schema\n");
    if (res.rows[0].has_schema) {
      const counts = await (async () => {
        const c = new pg.Client({ connectionString: db, ssl: { rejectUnauthorized: false } });
        await c.connect();
        const r = await c.query(`
          select
            (select count(*) from employees) as employees,
            (select count(*) from projects) as projects,
            (select count(*) from allocations) as allocations
        `);
        await c.end();
        return r.rows[0];
      })();
      console.log("  ✓ Tables exist");
      console.log(`      employees: ${counts.employees}, projects: ${counts.projects}, allocations: ${counts.allocations}`);
      if (Number(counts.employees) === 0) {
        console.log("\n  → Run: npm run db:setup\n");
      }
    } else {
      console.log("  ⚠ Tables not found yet");
      console.log("  → Run: npm run db:setup\n");
    }
  } catch {
    /* already reported connection errors */
  }
}

function printHowToFill() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  How to fill .env.local (5 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to https://supabase.com/dashboard and open your project
   (or create one — save the database password!)

2. Project Settings → API
   • Project URL  → NEXT_PUBLIC_SUPABASE_URL
   • anon public  → NEXT_PUBLIC_SUPABASE_ANON_KEY

3. Project Settings → Database → Connection string
   • Tab: URI
   • Mode: Session (or Direct connection — see below)
   • Copy the string and replace [YOUR-PASSWORD] with your DB password
   • Paste as DATABASE_URL=

   Direct connection (if pooler fails):
   postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

4. Save .env.local, then run:
   npm run supabase:check
   npm run db:setup
   npm run dev

5. Supabase → Authentication → Providers → enable Email
   (optional for dev: disable "Confirm email")

6. Open http://localhost:3000/login and sign up

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

loadEnv();

const envOk = checkEnvVars();
if (!envOk) {
  printHowToFill();
  process.exit(1);
}

const apiOk = await testSupabaseApi();
const dbOk = await testDatabase();

if (dbOk) {
  await checkTables();
}

if (envOk && apiOk && dbOk) {
  console.log("\n✅ Supabase is configured correctly!\n");
  console.log("Next: npm run db:setup  (if you haven't seeded yet)");
  console.log("       npm run dev     → http://localhost:3000/login\n");
  process.exit(0);
}

printHowToFill();
process.exit(1);
