"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { canAccessRoute, getFirstAllowedAppPath } from "@/lib/auth/route-access";
import { usePermissions } from "@/hooks/use-permissions";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, authLoading, profile } = usePermissions();

  useEffect(() => {
    if (authLoading) return;
    if (canAccessRoute(pathname, permissions)) return;
    router.replace(getFirstAllowedAppPath(permissions, profile?.app_role));
  }, [authLoading, pathname, permissions, profile?.app_role, router]);

  if (authLoading) {
    return null;
  }

  if (!canAccessRoute(pathname, permissions)) {
    return null;
  }

  return <>{children}</>;
}
