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

After `npm run db:setup` (includes the profiles migration):

| Role | Can do |
|------|--------|
| **Admin** | Everything + invite users (Settings → Team access) |
| **Member** | Scheduling, projects, dashboard; **read-only** Settings |

**Invite-only (recommended):**

1. Do **not** set `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=true` (default is invite-only in the UI).
2. Supabase → **Authentication** → **Providers** → **Email** → disable **Allow new users to sign up** (or restrict sign-ups in Supabase Auth settings).
3. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and Vercel (never use `NEXT_PUBLIC_` for this key).
4. Sign in as an admin → **Settings** → **Team access** → **Send invite** or change roles. Add their email on **Schedule team** first so the app links their login to the grid row.

5. **Settings** → **Schedule team** → add/edit designers on the weekly grid (name, role, capacity). Use the mail icon to send an app invite when they have an email but no linked login.

**Invite email (Supabase):** Authentication → [Email Templates](https://supabase.com/dashboard/project/_/auth/templates) → **Invite user** — customize subject/body (mention ZEN Team Scheduling and that the link sets their password). Ensure **Redirect URLs** include `https://your-domain.com/**` and `https://your-domain.com/auth/callback`.

**Email linking:** If a schedule team member and an app user share the same email (case-insensitive), they link automatically. Set the email on the team row, invite/login with that email, or update either side later — the link syncs in the database.

The first user in the database becomes **admin** automatically. Existing users are backfilled when you run the migration.

Apply new migrations anytime:

```bash
npm run db:setup
```

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

---

## Features

| Screen | Description |
|--------|-------------|
| **Team Scheduling** | Weekly grid, drag-and-drop, utilization |
| **Projects** | Budget vs scheduled; click name for detail page |
| **Settings** | Company defaults and employee capacity |
| **Dashboard** | Team utilization overview |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run supabase:check` | Validate `.env.local` and test connections |
| `npm run db:setup` | Apply migration + seed data |
| `npm run build` | Production build |
