export type AppRole = "admin" | "member";

export function isPublicSignupAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === "true";
}

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === "admin";
}
