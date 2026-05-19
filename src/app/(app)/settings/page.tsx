"use client";

import { AppPage } from "@/components/layout/app-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AccountLinkCard } from "@/components/settings/account-link-card";
import { MemberAccessBanner } from "@/components/settings/member-access-banner";
import { MemberPermissionsCard } from "@/components/settings/member-permissions-card";
import { TeamAccessCard } from "@/components/settings/team-access-card";
import { TeamMembersCard } from "@/components/settings/team-members-card";
import { CategoriesCard } from "@/components/settings/categories-card";
import { TeamOptionsCard } from "@/components/settings/team-options-card";
import { TimeClassCodesCard } from "@/components/settings/time-class-codes-card";
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import { getAppRoleLabel } from "@/lib/auth/roles";
import { usePermissions } from "@/hooks/use-permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SettingsPage() {
  const { settings, updateSettings } = useScheduling();
  const { profile, isLoading: authLoading } = useAuth();
  const { permissions, linkedEmployeeId, localMode } = usePermissions();

  const showMemberBanner =
    isSupabaseConfigured() && !localMode && !permissions.editCompanySettings && !authLoading;

  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {permissions.manageAppAccess
            ? "Company defaults, schedule team, and app access."
            : permissions.manageTeamMembers
              ? "Company defaults, schedule team, and team options. App access is admin-only."
              : "Company defaults (view only)."}
          {isSupabaseConfigured() && profile && !authLoading && (
            <span className="ml-1">· App role: {getAppRoleLabel(profile.app_role)}</span>
          )}
        </p>
        {showMemberBanner && <MemberAccessBanner linkedEmployeeId={linkedEmployeeId} />}
      </div>

      {permissions.manageAppAccess && <MemberPermissionsCard />}

      {isSupabaseConfigured() && <AccountLinkCard />}

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
              disabled={!permissions.editCompanySettings}
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
              disabled={!permissions.editCompanySettings}
              value={settings.default_weekly_capacity}
              onChange={(e) =>
                updateSettings({ default_weekly_capacity: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              id="weekends"
              disabled={!permissions.editCompanySettings}
              checked={settings.include_weekends}
              onCheckedChange={(v) => updateSettings({ include_weekends: v })}
            />
            <Label htmlFor="weekends">Include weekends in schedule</Label>
          </div>
        </CardContent>
      </Card>

      <CategoriesCard canEdit={permissions.editCompanySettings} />
      {permissions.editCompanySettings && (
        <TimeClassCodesCard canEdit={permissions.editCompanySettings} />
      )}
      {permissions.manageTeamOptions && <TeamOptionsCard canEdit={permissions.manageTeamOptions} />}
      {permissions.manageTeamMembers && (
        <TeamMembersCard canEdit={permissions.manageTeamMembers} />
      )}
    </AppPage>
  );
}
