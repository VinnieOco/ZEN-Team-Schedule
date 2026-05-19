import type { AppRole } from "@/lib/auth/roles";

/** Default page after sign-in and for the app root (Office Team and above). */
export const DEFAULT_APP_PATH = "/dashboard";

export function getHomePathForRole(role: AppRole | null | undefined): string {
  if (role === "crew") return "/time-tracking";
  return DEFAULT_APP_PATH;
}
