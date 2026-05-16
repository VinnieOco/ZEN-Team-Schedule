"use client";

import { useState } from "react";
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
import { useScheduling } from "@/context/scheduling-context";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee } from "@/types";

interface TeamMembersCardProps {
  canEdit: boolean;
}

export function TeamMembersCard({ canEdit }: TeamMembersCardProps) {
  const { employees } = useScheduling();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

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
              People on the weekly grid. Rows with the same email as an app login are linked
              automatically.
            </CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add team member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>App login</TableHead>
                {canEdit && <TableHead className="w-[80px]" />}
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
                      <span className="text-xs text-muted-foreground">No match</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(employee)}
                        aria-label={`Edit ${getEmployeeFullName(employee)}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employee={editingEmployee}
        />
      )}
    </>
  );
}
