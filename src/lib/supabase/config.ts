const PLACEHOLDER_PATTERNS = [
  "your-project",
  "your-anon-key",
  "your-anon",
  "[YOUR-PASSWORD]",
  "[project-ref]",
  "xxxx.supabase",
  "paste_anon",
];

function isPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim().length < 10) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

function isValidAnonKey(key: string): boolean {
  return key.startsWith("eyJ") || key.startsWith("sb_publishable_");
}

/** True when real Supabase API credentials are set (not template placeholders). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (isPlaceholder(url) || isPlaceholder(key) || !isValidAnonKey(key ?? "")) return false;
  try {
    const parsed = new URL(url!);
    return parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** True when DATABASE_URL looks like a real Postgres connection string. */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (isPlaceholder(url)) return false;
  return Boolean(url?.startsWith("postgresql://"));
}

export function getSupabaseConfigIssues(): string[] {
  const issues: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const db = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (isPlaceholder(url)) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL is missing or still a placeholder");
  }
  if (isPlaceholder(key)) {
    issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still a placeholder");
  }
  if (isPlaceholder(db)) {
    issues.push("DATABASE_URL is missing or still a placeholder (needed for npm run db:setup)");
  }
  return issues;
}
