import { isAdminRole, isManagerOrAdminRole, type AppRole } from "@/lib/auth/roles";

export interface AppPermissions {
  viewDashboard: boolean;
  viewProjects: boolean;
  editProjects: boolean;
  viewScheduling: boolean;
  editScheduling: boolean;
  viewTimeTracking: boolean;
  /** Log or edit time for any team member */
  logTimeForAnyone: boolean;
  viewReports: boolean;
  exportReports: boolean;
  viewSettings: boolean;
  editCompanySettings: boolean;
  manageTeamMembers: boolean;
  manageTeamOptions: boolean;
  /** Invites, app roles, manual login links, permissions matrix */
  manageAppAccess: boolean;
}

export interface PermissionRow {
  label: string;
  admin: string;
  manager: string;
  member: string;
}

/** Human-readable matrix shown to admins in Settings */
export const PERMISSION_MATRIX: PermissionRow[] = [
  { label: "Dashboard", admin: "View", manager: "View", member: "View" },
  { label: "Team scheduling", admin: "View and edit", manager: "View and edit", member: "View and edit" },
  { label: "Projects", admin: "View and edit", manager: "View and edit", member: "View only" },
  {
    label: "Time tracking",
    admin: "Log and edit for anyone",
    manager: "Log and edit for anyone",
    member: "Log and edit own hours only",
  },
  { label: "Reports", admin: "View and export CSV", manager: "View and export CSV", member: "View only" },
  { label: "Settings — company defaults", admin: "Edit", manager: "Edit", member: "View only" },
  {
    label: "Settings — schedule team",
    admin: "Add and edit members",
    manager: "Add and edit members",
    member: "Hidden",
  },
  {
    label: "Settings — team options",
    admin: "Edit job roles and departments",
    manager: "Edit job roles and departments",
    member: "Hidden",
  },
  {
    label: "Settings — app access",
    admin: "Invite users and manage roles",
    manager: "Hidden",
    member: "Hidden",
  },
];

function adminPermissions(): AppPermissions {
  return {
    viewDashboard: true,
    viewProjects: true,
    editProjects: true,
    viewScheduling: true,
    editScheduling: true,
    viewTimeTracking: true,
    logTimeForAnyone: true,
    viewReports: true,
    exportReports: true,
    viewSettings: true,
    editCompanySettings: true,
    manageTeamMembers: true,
    manageTeamOptions: true,
    manageAppAccess: true,
  };
}

function managerPermissions(): AppPermissions {
  return {
    viewDashboard: true,
    viewProjects: true,
    editProjects: true,
    viewScheduling: true,
    editScheduling: true,
    viewTimeTracking: true,
    logTimeForAnyone: true,
    viewReports: true,
    exportReports: true,
    viewSettings: true,
    editCompanySettings: true,
    manageTeamMembers: true,
    manageTeamOptions: true,
    manageAppAccess: false,
  };
}

function memberPermissions(): AppPermissions {
  return {
    viewDashboard: true,
    viewProjects: true,
    editProjects: false,
    viewScheduling: true,
    editScheduling: true,
    viewTimeTracking: true,
    logTimeForAnyone: false,
    viewReports: true,
    exportReports: false,
    viewSettings: true,
    editCompanySettings: false,
    manageTeamMembers: false,
    manageTeamOptions: false,
    manageAppAccess: false,
  };
}

export function getPermissions(
  role: AppRole | null | undefined,
  options?: { localMode?: boolean },
): AppPermissions {
  if (options?.localMode) return adminPermissions();
  if (isAdminRole(role)) return adminPermissions();
  if (role === "manager") return managerPermissions();
  return memberPermissions();
}

export function canEditTimeEntry(
  permissions: AppPermissions,
  entryEmployeeId: string,
  linkedEmployeeId: string | null,
): boolean {
  if (permissions.logTimeForAnyone) return true;
  if (!linkedEmployeeId) return false;
  return entryEmployeeId === linkedEmployeeId;
}

/** @deprecated Use permissions from getPermissions / usePermissions instead */
export function hasElevatedAccess(role: AppRole | null | undefined): boolean {
  return isManagerOrAdminRole(role);
}
