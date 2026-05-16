"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { TeamAccessCard } from "@/components/settings/team-access-card";
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getEmployeeFullName } from "@/lib/week";

export default function SettingsPage() {
  const { settings, employees, updateSettings, updateEmployee, dataSource } = useScheduling();
  const { isAdmin, profile, isLoading: authLoading } = useAuth();
  const canEdit = !isSupabaseConfigured() || dataSource === "local" || isAdmin;

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company defaults and team member capacity.
          {isSupabaseConfigured() && profile && !authLoading && (
            <span className="ml-1 capitalize">· App role: {profile.app_role}</span>
          )}
        </p>
        {isSupabaseConfigured() && !canEdit && !authLoading && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You have member access. Scheduling and projects are editable; company settings and team
            capacity require an admin.
          </p>
        )}
      </div>

      <TeamAccessCard />

      <Card>
        <CardHeader>
          <CardTitle>Company Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Default daily capacity (hours)</Label>
            <Input
              type="number"
              disabled={!canEdit}
              value={settings.default_daily_capacity}
              onChange={(e) =>
                updateSettings({ default_daily_capacity: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Default weekly capacity (hours)</Label>
            <Input
              type="number"
              disabled={!canEdit}
              value={settings.default_weekly_capacity}
              onChange={(e) =>
                updateSettings({ default_weekly_capacity: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              id="weekends"
              disabled={!canEdit}
              checked={settings.include_weekends}
              onCheckedChange={(v) => updateSettings({ include_weekends: v })}
            />
            <Label htmlFor="weekends">Include weekends in schedule</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Daily Cap.</TableHead>
                <TableHead>Weekly Cap.</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{getEmployeeFullName(employee)}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      disabled={!canEdit}
                      value={employee.daily_capacity_hours}
                      onChange={(e) =>
                        updateEmployee(employee.id, {
                          daily_capacity_hours: Number(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      disabled={!canEdit}
                      value={employee.weekly_capacity_hours}
                      onChange={(e) =>
                        updateEmployee(employee.id, {
                          weekly_capacity_hours: Number(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      disabled={!canEdit}
                      checked={employee.active}
                      onCheckedChange={(v) => updateEmployee(employee.id, { active: v })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
