# ZEN Team Scheduling

Resource planning and weekly team scheduling for landscape design departments.

## Quick start (local demo — no Supabase)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — data saves in your browser.

---

## Deploy on Vercel

This app uses the **Next.js** preset on Vercel (no custom `vercel.json` required).

### 1. Repository

Push the project to GitHub, GitLab, or Bitbucket, then import it in the [Vercel dashboard](https://vercel.com/new).

### 2. Environment variables (Production)

In the Vercel project → **Settings** → **Environment Variables**, add:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as local **Project URL** | Required for auth + live data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as local `anon public` key | Must be the real JWT (`eyJ...`) or `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` | **Server only** — admin email invites |
| `NEXT_PUBLIC_SITE_URL` | `https://zenteamschedule.com` (your production URL) | Used in invite email links; set on Vercel |
| `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` | `false` (recommended) | Omit or set `true` to allow open sign-up on `/login` |

You do **not** need `DATABASE_URL` on Vercel for the running site — it is only used by `npm run db:setup` and `npm run supabase:check` on your machine.

If these variables are missing or invalid, the app still deploys and runs in **browser demo** mode (no login).

### 3. Supabase redirects

After the first deploy, copy your production URL (e.g. `https://your-app.vercel.app`).

1. Supabase → **Authentication** → **URL configuration**
2. Set **Site URL** to that origin (`https://your-app.vercel.app`)
3. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/auth/callback`

For a custom domain, add the same patterns with your domain and set **Site URL** to the primary URL.

### 4. Build

The default **Build Command** is `next build` and **Install Command** is `npm install`. Node **20.9+** is declared in `package.json` `engines`.

Redeploy after changing environment variables.

---

## Team access & roles

After `npm run db:setup` (includes profiles, permissions, and manager migrations):

| Role | App access |
|------|------------|
| **Admin** | Full access — scheduling, projects, time tracking, reports (export), all Settings including **Team access** (invites, roles, login links) |
| **Manager** | Same as admin for day-to-day work; **cannot** invite users or change app roles (no Team access section) |
| **Member** | View/edit **team schedule**; view projects and reports; log **own** time only; Settings is read-only (company defaults) |

See **Settings → App roles** (admins only) for the full matrix.

**Invite-only (recommended):**

1. Do **not** set `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=true` (default is invite-only in the UI).
2. Supabase → **Authentication** → **Providers** → **Email** → disable **Allow new users to sign up** (or restrict sign-ups in Supabase Auth settings).
3. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and Vercel (never use `NEXT_PUBLIC_` for this key).
4. Sign in as an admin → **Settings** → **Team access** → **Send invite** or change roles. Add their email on **Schedule team** first so the app links their login to the grid row.

5. **Settings** → **Schedule team** → add/edit designers on the weekly grid (name, role, capacity). Use the mail icon to send an app invite when they have an email but no linked login.

**Invite email (Supabase):** Authentication → [Email Templates](https://supabase.com/dashboard/project/_/auth/templates) → **Invite user** — customize subject/body (mention ZEN Team Scheduling and that the link sets their password). Ensure **Redirect URLs** include `https://your-domain.com/**` and `https://your-domain.com/auth/callback`.

**Login ↔ schedule team:** Members need their app login linked to a row on **Schedule team** to log time.

- **Automatic:** Matching emails link when you save the team row or profile.
- **Self-service:** **Settings → Schedule profile link** → **Link my account**.
- **Admin:** **Settings → Team access** → choose a person in the **Schedule team** column.

The first user in the database becomes **admin** automatically.

**Apply new migrations** (skips files already recorded in `_schema_migrations`):

```bash
npm run db:migrate
```

Use this on production or any database that already has real data. It does **not** run the seed.

| Command | What it does |
|---------|----------------|
| `npm run db:migrate` | Pending migrations only |
| `npm run db:setup` | Migrations + sample seed (fresh local dev) |
| `npm run db:seed` | Seed only (can duplicate sample rows) |

---

## Supabase setup (Priority A)

Your `.env.local` must contain **real** values from your Supabase project (not the template placeholders).

### Step 1 — Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → choose a name and region
3. **Save the database password** — you need it for `DATABASE_URL`

### Step 2 — Copy credentials into `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` in Cursor (**Cmd + P** → type `.env.local`).

| Variable | Where in Supabase |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project Settings → API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project Settings → API** → `anon` `public` key |
| `DATABASE_URL` | **Project Settings → Database** → Connection string → **URI** |

**DATABASE_URL tips:**

- Replace `[YOUR-PASSWORD]` with the password you set when creating the project.
- The username must look like `postgres.abcdefghijklmnop` where `abcdefghijklmnop` is your **project ref** (the subdomain in `https://abcdefghijklmnop.supabase.co`).
- If you get **"Tenant or user not found"**, use the **Direct connection** string instead:

```
postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

- If your password has special characters (`@`, `#`, `%`), [URL-encode](https://www.urlencoder.org/) them.

### Step 3 — Validate configuration

```bash
npm run supabase:check
```

You should see green checkmarks for URL, anon key, database, and API. If anything fails, the script prints specific fix instructions.

### Step 4 — Run migration + seed

```bash
npm run db:setup
```

Creates tables and loads 6 employees, 6 projects, and sample allocations for **this week**.

### Step 5 — Enable email login

1. Supabase → **Authentication** → **Providers** → enable **Email**
2. For faster dev testing: **Authentication** → **Email** → turn off **Confirm email**

### Step 6 — Run the app and sign up

```bash
npm run dev
```

1. Open [http://localhost:3000/login](http://localhost:3000/login)
2. **Sign up** with your email and a password (min 6 characters)
3. You should land on Team Scheduling with a green **Connected to Supabase** banner

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Tenant or user not found` | Wrong project ref or password in `DATABASE_URL`. Use Direct connection string. Run `npm run supabase:check`. |
| `password authentication failed` | Reset password: Project Settings → Database → Reset database password |
| Redirected to `/login` in demo mode | `.env.local` has placeholder URLs — fix or remove invalid `NEXT_PUBLIC_SUPABASE_*` vars |
| `Another next dev server is already running` | Run `kill 76009` (use PID from terminal) or close the other terminal |
| Empty schedule after login | Run `npm run db:setup` again |
| Supabase API returned **401** on `npm run supabase:check` | Re-copy the **anon public** key from Project Settings → API (not `service_role`). URL and key must be from the same project. Older checker versions probed `/rest/v1/` which returns 401 even with a valid key — update the repo and re-run the check. |
| `policy … already exists` on `db:setup` | Migration partially applied; pull latest repo (migrations use `DROP POLICY IF EXISTS`) and run `npm run db:setup` again |

---

## Features

| Screen | Description |
|--------|-------------|
| **Dashboard** | Team utilization overview |
| **Team Scheduling** | Week/month grid, drag-and-drop, filters, print |
| **Projects** | Budget vs scheduled; detail page per project |
| **Time tracking** | Scheduled vs actual hours; log time (role-based) |
| **Reports** | Utilization, scheduled vs actual, project budgets; CSV export (admin/manager) |
| **Settings** | Company defaults, schedule team, job roles/departments, app access (admin) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run supabase:check` | Validate `.env.local` and test connections |
| `npm run db:migrate` | Apply pending migrations only (no seed) |
| `npm run db:setup` | Migrations + sample seed (local / fresh DB) |
| `npm run db:seed` | Sample seed only |
| `npm run build` | Production build |
