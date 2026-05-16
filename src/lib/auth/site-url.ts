/** Canonical app URL for auth redirects (invite, password reset). */
export function getSiteUrl(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (request) {
    const origin = request.headers.get("origin");
    if (origin) {
      return origin.replace(/\/$/, "");
    }

    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}

export function inviteCallbackPath(): string {
  return "/auth/callback?next=/auth/accept-invite";
}

export function inviteRedirectUrl(request?: Request): string {
  return `${getSiteUrl(request)}${inviteCallbackPath()}`;
}
