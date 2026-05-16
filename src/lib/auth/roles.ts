export type AppRole = "admin" | "manager" | "member";

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
  return "member";
}
