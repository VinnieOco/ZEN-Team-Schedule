import type { AppPermissions } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/roles";
import { getHomePathForRole } from "@/lib/routes";

type RoutePermissionKey = keyof Pick<
  AppPermissions,
  | "viewDashboard"
  | "viewScheduling"
  | "viewTimeTracking"
  | "viewProjects"
  | "viewCrm"
  | "viewQueue"
  | "viewReports"
  | "viewSettings"
>;

const ROUTE_CHECKS: { prefix: string; permission: RoutePermissionKey }[] = [
  { prefix: "/settings", permission: "viewSettings" },
  { prefix: "/crm", permission: "viewCrm" },
  { prefix: "/projects", permission: "viewProjects" },
  { prefix: "/queue", permission: "viewQueue" },
  { prefix: "/reports", permission: "viewReports" },
  { prefix: "/scheduling", permission: "viewScheduling" },
  { prefix: "/time-tracking", permission: "viewTimeTracking" },
  { prefix: "/dashboard", permission: "viewDashboard" },
];

const FALLBACK_PATH_ORDER: { path: string; permission: RoutePermissionKey }[] = [
  { path: "/time-tracking", permission: "viewTimeTracking" },
  { path: "/dashboard", permission: "viewDashboard" },
  { path: "/scheduling", permission: "viewScheduling" },
  { path: "/projects", permission: "viewProjects" },
  { path: "/queue", permission: "viewQueue" },
  { path: "/crm", permission: "viewCrm" },
  { path: "/reports", permission: "viewReports" },
  { path: "/settings", permission: "viewSettings" },
];

export function getRoutePermission(pathname: string): RoutePermissionKey | null {
  const match = ROUTE_CHECKS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match?.permission ?? null;
}

export function canAccessRoute(pathname: string, permissions: AppPermissions): boolean {
  const required = getRoutePermission(pathname);
  if (!required) return true;
  return permissions[required];
}

export function getFirstAllowedAppPath(permissions: AppPermissions, role?: AppRole | null): string {
  for (const { path, permission } of FALLBACK_PATH_ORDER) {
    if (permissions[permission]) return path;
  }
  return getHomePathForRole(role);
}
