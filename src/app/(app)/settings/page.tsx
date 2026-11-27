"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

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
import { HandoffChecklistsCard } from "@/components/settings/handoff-checklists-card";
import { KnowledgeLibraryCard } from "@/components/settings/knowledge-library-card";
import { LeadFollowUpTypesCard } from "@/components/settings/lead-follow-up-types-card";
import { LeadSourcesCard } from "@/components/settings/lead-sources-card";
import { LeadStagesCard } from "@/components/settings/lead-stages-card";
import { TeamOptionsCard } from "@/components/settings/team-options-card";
import { TimeClassCodesCard } from "@/components/settings/time-class-codes-card";
import { useAuth } from "@/context/auth-context";
import { useScheduling } from "@/context/scheduling-context";
import { getAppRoleLabel } from "@/lib/auth/roles";
import { usePermissions } from "@/hooks/use-permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

const SECTION_STORAGE_KEY = "zen-settings-sections";

function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SECTION_STORAGE_KEY) ?? "{}") as Record<
        string,
        boolean
      >;
      if (typeof saved[id] === "boolean") setOpen(saved[id]);
    } catch {
      // Ignore unreadable saved preferences.
    }
  }, [id]);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      try {
        const saved = JSON.parse(localStorage.getItem(SECTION_STORAGE_KEY) ?? "{}") as Record<
          string,
          boolean
        >;
        saved[id] = next;
        localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(saved));
      } catch {
        // The section still toggles for this visit.
      }
      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      <div className={cn("space-y-4 border-t px-4 py-4", !open && "hidden")}>{children}</div>
    </section>
  );
}

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

      {permissions.manageAppAccess && isSupabaseConfigured() && (
        <SettingsSection id="help" title="Help">
          <KnowledgeLibraryCard />
        </SettingsSection>
      )}

      {permissions.manageAppAccess && (
        <SettingsSection id="access" title="Access">
          <MemberPermissionsCard />
          {isSupabaseConfigured() && <AccountLinkCard />}
          <TeamAccessCard />
        </SettingsSection>
      )}

      {!permissions.manageAppAccess && isSupabaseConfigured() && <AccountLinkCard />}

      <SettingsSection id="company" title="Company">
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
        <HandoffChecklistsCard canEdit={permissions.editCompanySettings} />
        <CategoriesCard canEdit={permissions.editCompanySettings} />
        {permissions.editCompanySettings && (
          <TimeClassCodesCard canEdit={permissions.editCompanySettings} />
        )}
      </SettingsSection>

      <SettingsSection id="pipeline" title="Pipeline">
        <LeadStagesCard canEdit={permissions.editCompanySettings} />
        <LeadSourcesCard canEdit={permissions.editCompanySettings} />
        <LeadFollowUpTypesCard canEdit={permissions.editCompanySettings} />
      </SettingsSection>

      {(permissions.manageTeamOptions || permissions.manageTeamMembers) && (
        <SettingsSection id="team" title="Team">
          {permissions.manageTeamOptions && <TeamOptionsCard canEdit={permissions.manageTeamOptions} />}
          {permissions.manageTeamMembers && (
            <TeamMembersCard canEdit={permissions.manageTeamMembers} />
          )}
        </SettingsSection>
      )}
    </AppPage>
  );
}
