"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Pencil, Plus, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeFormDialog } from "@/components/settings/employee-form-dialog";
import { InviteEmailButton } from "@/components/settings/invite-email-button";
import { UserAccessActions } from "@/components/settings/user-access-actions";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import type { AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee } from "@/types";

interface ProfileRow {
  id: string;
  email: string | null;
  app_role: AppRole;
}

interface TeamMembersCardProps {
  canEdit: boolean;
}

export function TeamMembersCard({ canEdit }: TeamMembersCardProps) {
  const { employees, allocations, timeEntries, deleteEmployee } = useScheduling();
  const { permissions: userPermissions } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const canDelete = canEdit && userPermissions.deleteTeamMembers;
  const showInviteActions = canEdit && isSupabaseConfigured() && userPermissions.manageAppAccess;
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const loadProfiles = useCallback(async () => {
    if (!showInviteActions) return;
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("id, email, app_role");
    if (data) setProfiles(data as ProfileRow[]);
  }, [showInviteActions]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const visibleEmployees = useMemo(() => {
    const list = showInactive ? employees : employees.filter((e) => e.active);
    return [...list].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return getEmployeeFullName(a).localeCompare(getEmployeeFullName(b));
    });
  }, [employees, showInactive]);

  const inactiveCount = useMemo(
    () => employees.filter((e) => !e.active).length,
    [employees],
  );

  const openAdd = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    const name = getEmployeeFullName(employee);
    const allocCount = allocations.filter((a) => a.employee_id === employee.id).length;
    const timeCount = timeEntries.filter((e) => e.employee_id === employee.id).length;

    let detail = `Remove ${name} from the schedule team?`;
    if (allocCount > 0 || timeCount > 0) {
      detail += ` This also deletes ${allocCount} schedule allocation(s) and ${timeCount} time entr${timeCount === 1 ? "y" : "ies"}.`;
    }
    detail += " This cannot be undone.";

    if (!window.confirm(detail)) return;

    setActionMessage(null);
    const result = deleteEmployee(employee.id);
    if (!result.ok) {
      setActionMessage(result.message);
      return;
    }
    setActionMessage(`${name} was removed from the schedule team.`);
  };

  const actionsColWidth = canDelete && showInviteActions
    ? "w-[148px]"
    : canDelete || showInviteActions
      ? "w-[108px]"
      : "w-[80px]";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Schedule team</CardTitle>
            <CardDescription>
              People on the weekly grid. Matching emails link to app logins automatically; admins can
              also link manually under Team access.
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add team member
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-slate-50/80 px-3 py-2">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive-team"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive-team" className="text-sm font-normal">
                Show inactive members
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {showInactive
                ? `Showing all ${employees.length} members`
                : `Showing ${visibleEmployees.length} active`}
              {inactiveCount > 0 && !showInactive && (
                <span> · {inactiveCount} inactive hidden</span>
              )}
            </p>
          </div>

          {(inviteMessage || actionMessage) && (
            <p
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                (inviteMessage ?? actionMessage ?? "").toLowerCase().includes("fail") ||
                  (inviteMessage ?? actionMessage ?? "").toLowerCase().includes("error") ||
                  (inviteMessage ?? actionMessage ?? "").toLowerCase().includes("cannot")
                  ? "bg-red-50 text-red-800"
                  : "bg-emerald-50 text-emerald-900",
              )}
            >
              {actionMessage ?? inviteMessage}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>App login</TableHead>
                {canEdit && <TableHead className={actionsColWidth} />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className={cn(!employee.active && "bg-slate-50/60 text-muted-foreground")}
                >
                  <TableCell className="font-medium">{getEmployeeFullName(employee)}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm">{employee.role}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {employee.daily_capacity_hours}d / {employee.weekly_capacity_hours}w
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.active ? "default" : "muted"}>
                      {employee.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.profile_id ? (
                      <Badge variant="outline" className="gap-1 text-emerald-700">
                        <Link2 className="h-3 w-3" />
                        Linked
                      </Badge>
                    ) : employee.email ? (
                      <span className="text-xs text-muted-foreground">Invite pending</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {showInviteActions && employee.email && !employee.profile_id && (
                          <InviteEmailButton
                            email={employee.email}
                            size="icon"
                            variant="ghost"
                            onMessage={setInviteMessage}
                          />
                        )}
                        {showInviteActions &&
                          employee.email &&
                          employee.profile_id &&
                          (() => {
                            const linkedProfile = profiles.find(
                              (p) => p.id === employee.profile_id,
                            );
                            if (!linkedProfile?.email) return null;
                            return (
                              <UserAccessActions
                                userId={linkedProfile.id}
                                email={linkedProfile.email}
                                role={linkedProfile.app_role}
                                onMessage={setInviteMessage}
                              />
                            );
                          })()}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(employee)}
                          aria-label={`Edit ${getEmployeeFullName(employee)}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDelete(employee)}
                            aria-label={`Delete ${getEmployeeFullName(employee)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {visibleEmployees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    <UserPlus className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {showInactive
                      ? "No team members yet."
                      : "No active team members."}
                    {canEdit && !showInactive && inactiveCount > 0 && (
                      <span> Turn on &quot;Show inactive members&quot; to see {inactiveCount} inactive.</span>
                    )}
                    {canEdit && employees.length === 0 && " Add your first designer to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canEdit && (
        <EmployeeFormDialog
          key={editingEmployee?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingEmployee(null);
          }}
          employee={editingEmployee}
        />
      )}
    </>
  );
}
