import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Timer,
  Users,
} from "lucide-react";

import type { AppPermissions } from "@/lib/auth/permissions";

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: keyof Pick<
    AppPermissions,
    | "viewDashboard"
    | "viewScheduling"
    | "viewTimeTracking"
    | "viewProjects"
    | "viewCrm"
    | "viewReports"
    | "viewSettings"
  >;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "viewDashboard" },
  { href: "/scheduling", label: "Team Scheduling", icon: CalendarDays, permission: "viewScheduling" },
  { href: "/time-tracking", label: "Time Tracking", icon: Timer, permission: "viewTimeTracking" },
  { href: "/projects", label: "Projects", icon: FolderKanban, permission: "viewProjects" },
  { href: "/crm", label: "CRM", icon: Users, permission: "viewCrm" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "viewReports" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "viewSettings" },
];

export function getVisibleNavItems(permissions: AppPermissions): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => permissions[item.permission]);
}
