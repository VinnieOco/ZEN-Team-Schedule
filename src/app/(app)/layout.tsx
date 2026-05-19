import { AppRouteGuard } from "@/components/auth/app-route-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DataSourceBanner } from "@/components/layout/data-source-banner";
import { AuthProvider } from "@/context/auth-context";
import { SchedulingProvider } from "@/context/scheduling-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SchedulingProvider>
        <AppShell>
          <DataSourceBanner />
          <AppRouteGuard>{children}</AppRouteGuard>
        </AppShell>
      </SchedulingProvider>
    </AuthProvider>
  );
}
