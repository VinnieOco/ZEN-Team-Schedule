/** Normalize emails for case-insensitive matching (mirrors DB function). */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function emailsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeEmail(a);
  const nb = normalizeEmail(b);
  return na !== null && nb !== null && na === nb;
}
