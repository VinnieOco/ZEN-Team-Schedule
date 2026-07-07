import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  GanttChart,
  LayoutDashboard,
  ListOrdered,
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
    | "viewTodos"
    | "viewScheduling"
    | "viewTimeTracking"
    | "viewProjects"
    | "viewCrm"
    | "viewQueue"
    | "viewReports"
    | "viewSettings"
  >;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "viewDashboard" },
  { href: "/todos", label: "To-dos", icon: CheckSquare, permission: "viewTodos" },
  { href: "/scheduling", label: "Team Scheduling", icon: CalendarDays, permission: "viewScheduling" },
  { href: "/time-tracking", label: "Time Tracking", icon: Timer, permission: "viewTimeTracking" },
  { href: "/projects", label: "Projects", icon: FolderKanban, permission: "viewProjects" },
  { href: "/gantt", label: "Schedules", icon: GanttChart, permission: "viewProjects" },
  { href: "/queue", label: "Queue", icon: ListOrdered, permission: "viewQueue" },
  { href: "/crm", label: "CRM", icon: Users, permission: "viewCrm" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "viewReports" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "viewSettings" },
];

export function getVisibleNavItems(permissions: AppPermissions): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => permissions[item.permission]);
}
