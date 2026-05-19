export type AppRole = "admin" | "manager" | "member" | "crew";

/** User-facing labels for app roles (DB value `member` → Office Team). */
export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Office Team",
  crew: "Crew Team",
};

export function getAppRoleLabel(role: AppRole | null | undefined): string {
  if (!role) return "—";
  return APP_ROLE_LABELS[role];
}

export const APP_ROLE_SELECT_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "crew", label: APP_ROLE_LABELS.crew },
  { value: "member", label: APP_ROLE_LABELS.member },
  { value: "manager", label: APP_ROLE_LABELS.manager },
  { value: "admin", label: APP_ROLE_LABELS.admin },
];

export function isCrewRole(role: AppRole | null | undefined): boolean {
  return role === "crew";
}

export function isPublicSignupAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === "true";
}

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === "admin";
}

export function isManagerRole(role: AppRole | null | undefined): boolean {
  return role === "manager";
}

export function isManagerOrAdminRole(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

export function parseAppRole(value: unknown): AppRole {
  if (value === "admin") return "admin";
  if (value === "manager") return "manager";
  if (value === "crew") return "crew";
  if (value === "member") return "member";
  return "member";
}
