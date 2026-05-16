"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TeamAccessCard } from "@/components/settings/team-access-card";
import { TeamMembersCard } from "@/components/settings/team-members-card";
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SettingsPage() {
  const { settings, updateSettings, dataSource } = useScheduling();
  const { isAdmin, profile, isLoading: authLoading } = useAuth();
  const canEdit = !isSupabaseConfigured() || dataSource === "local" || isAdmin;

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company defaults, schedule team, and app access.
          {isSupabaseConfigured() && profile && !authLoading && (
            <span className="ml-1 capitalize">· App role: {profile.app_role}</span>
          )}
        </p>
        {isSupabaseConfigured() && !canEdit && !authLoading && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            You have member access. Scheduling and projects are editable; settings and team management
            require an admin.
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

      <TeamMembersCard canEdit={canEdit} />
    </div>
  );
}
