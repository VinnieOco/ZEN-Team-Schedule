"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeft, PanelLeftClose } from "lucide-react";

import { ZenLogo } from "@/components/layout/zen-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { getVisibleNavItems } from "@/lib/auth/nav-items";
import { getAppRoleLabel } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { cn } from "@/lib/utils";

interface AppSidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Show expand/collapse control (desktop layout). */
  showCollapseToggle?: boolean;
}

export function AppSidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  showCollapseToggle = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { permissions } = usePermissions();
  const navItems = getVisibleNavItems(permissions);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "border-b border-slate-800",
          collapsed ? "flex justify-center px-2 py-4" : "px-6 py-5",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-2",
          )}
        >
          <ZenLogo size={collapsed ? 32 : 36} priority />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide">ZEN</p>
              <p className="text-xs text-slate-400">Team Scheduling</p>
              {isSupabaseConfigured() && profile && (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {getAppRoleLabel(profile.app_role)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-800 py-4", collapsed ? "px-2" : "px-3")}>
        {showCollapseToggle && onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "mb-2 text-slate-400 hover:bg-slate-800 hover:text-white",
              collapsed ? "mx-auto h-9 w-9" : "w-full justify-start",
            )}
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        )}
        {isSupabaseConfigured() && (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            title="Sign out"
            aria-label="Sign out"
            className={cn(
              "text-slate-400 hover:bg-slate-800 hover:text-white",
              collapsed ? "mx-auto h-9 w-9" : "mb-2 w-full justify-start",
            )}
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "Sign out"}
          </Button>
        )}
        {!collapsed && <p className="px-3 text-xs text-slate-500">ZEN Associates, Inc.</p>}
      </div>
    </aside>
  );
}
