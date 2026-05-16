"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Pencil, Plus, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import type { AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  const { employees } = useScheduling();
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const showInviteActions = canEdit && isSupabaseConfigured() && isAdmin;
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

  const openAdd = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

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
          {inviteMessage && (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                inviteMessage.toLowerCase().includes("fail") ||
                inviteMessage.toLowerCase().includes("error")
                  ? "bg-red-50 text-red-800"
                  : "bg-emerald-50 text-emerald-900"
              }`}
            >
              {inviteMessage}
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
                {canEdit && (
                  <TableHead className={showInviteActions ? "w-[120px]" : "w-[80px]"} />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
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
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    <UserPlus className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No team members yet.
                    {canEdit && " Add your first designer to get started."}
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
