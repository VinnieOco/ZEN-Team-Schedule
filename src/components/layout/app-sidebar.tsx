"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

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
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { permissions } = usePermissions();
  const navItems = getVisibleNavItems(permissions);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-2">
          <ZenLogo size={36} priority />
          <div>
            <p className="text-sm font-semibold tracking-wide">ZEN</p>
            <p className="text-xs text-slate-400">Team Scheduling</p>
            {isSupabaseConfigured() && profile && (
              <p className="mt-0.5 text-[10px] text-slate-500">{getAppRoleLabel(profile.app_role)}</p>
            )}
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 px-3 py-4">
        {isSupabaseConfigured() && (
          <Button
            variant="ghost"
            className="mb-2 w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        )}
        <p className="px-3 text-xs text-slate-500">ZEN Associates, Inc.</p>
      </div>
    </aside>
  );
}
