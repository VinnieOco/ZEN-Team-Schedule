import { isAdminRole, isManagerOrAdminRole, type AppRole } from "@/lib/auth/roles";

export interface AppPermissions {
  viewDashboard: boolean;
  viewProjects: boolean;
  editProjects: boolean;
  viewScheduling: boolean;
  editScheduling: boolean;
  /** Edit allocations for any team member (admin only) */
  editSchedulingForAnyone: boolean;
  viewTimeTracking: boolean;
  /** Log or edit time for any team member */
  logTimeForAnyone: boolean;
  viewCrm: boolean;
  viewQueue: boolean;
  /** Move projects between queue stages (stored locally until DB integration) */
  editQueue: boolean;
  viewReports: boolean;
  exportReports: boolean;
  viewSettings: boolean;
  editCompanySettings: boolean;
  manageTeamMembers: boolean;
  /** Remove schedule team members from the database (admin only) */
  deleteTeamMembers: boolean;
  manageTeamOptions: boolean;
  /** Invites, app roles, manual login links, permissions matrix */
  manageAppAccess: boolean;
}

export interface PermissionRow {
  label: string;
  admin: string;
  manager: string;
  member: string;
  crew: string;
}

/** Human-readable matrix shown to admins in Settings */
export const PERMISSION_MATRIX: PermissionRow[] = [
  { label: "Dashboard", admin: "View", manager: "View", member: "View", crew: "View" },
  {
    label: "Team scheduling",
    admin: "View and edit all",
    manager: "View all; edit own department",
    member: "View all; edit own row only",
    crew: "View only",
  },
  { label: "CRM", admin: "View", manager: "View", member: "View", crew: "Hidden" },
  {
    label: "Queue",
    admin: "View and edit stages",
    manager: "View and edit stages",
    member: "View only",
    crew: "Hidden",
  },
  { label: "Projects", admin: "View and edit", manager: "View and edit", member: "View only", crew: "Hidden" },
  {
    label: "Time tracking",
    admin: "Log and edit for anyone",
    manager: "Log and edit for anyone",
    member: "Log and edit own hours only",
    crew: "Log and edit own hours only",
  },
  {
    label: "Reports",
    admin: "View and export CSV",
    manager: "View and export CSV",
    member: "View only",
    crew: "Hidden",
  },
  { label: "Settings — company defaults", admin: "Edit", manager: "Edit", member: "View only", crew: "Hidden" },
  {
    label: "Settings — categories",
    admin: "Add and remove",
    manager: "Add and remove",
    member: "Use presets only",
    crew: "Hidden",
  },
  {
    label: "Settings — schedule team",
    admin: "Add, edit, and delete members",
    manager: "Add and edit members",
    member: "Hidden",
    crew: "Hidden",
  },
  {
    label: "Settings — team options",
    admin: "Edit job roles and departments",
    manager: "Edit job roles and departments",
    member: "Hidden",
    crew: "Hidden",
  },
  {
    label: "Settings — app access",
    admin: "Invite users and manage roles",
    manager: "Hidden",
    member: "Hidden",
    crew: "Hidden",
  },
];

function adminPermissions(): AppPermissions {
  return {
    viewDashboard: true,
    viewProjects: true,
    editProjects: true,
    viewScheduling: true,
    editScheduling: true,
    editSchedulingForAnyone: true,
    viewTimeTracking: true,
    logTimeForAnyone: true,
    viewCrm: true,
    viewQueue: true,
    editQueue: true,
    viewReports: true,
    exportReports: true,
    viewSettings: true,
    editCompanySettings: true,
    manageTeamMembers: true,
    deleteTeamMembers: true,
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
    editSchedulingForAnyone: false,
    viewTimeTracking: true,
    logTimeForAnyone: true,
    viewCrm: true,
    viewQueue: true,
    editQueue: true,
    viewReports: true,
    exportReports: true,
    viewSettings: true,
    editCompanySettings: true,
    manageTeamMembers: true,
    deleteTeamMembers: false,
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
    editSchedulingForAnyone: false,
    viewTimeTracking: true,
    logTimeForAnyone: false,
    viewCrm: true,
    viewQueue: true,
    editQueue: false,
    viewReports: true,
    exportReports: false,
    viewSettings: true,
    editCompanySettings: false,
    manageTeamMembers: false,
    deleteTeamMembers: false,
    manageTeamOptions: false,
    manageAppAccess: false,
  };
}

function crewPermissions(): AppPermissions {
  return {
    viewDashboard: true,
    viewProjects: false,
    editProjects: false,
    viewScheduling: true,
    editScheduling: false,
    editSchedulingForAnyone: false,
    viewTimeTracking: true,
    logTimeForAnyone: false,
    viewCrm: false,
    viewQueue: false,
    editQueue: false,
    viewReports: false,
    exportReports: false,
    viewSettings: false,
    editCompanySettings: false,
    manageTeamMembers: false,
    deleteTeamMembers: false,
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
  if (role === "crew") return crewPermissions();
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
