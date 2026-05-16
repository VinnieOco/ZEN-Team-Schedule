import { AppShell } from "@/components/layout/app-shell";
import { DataSourceBanner } from "@/components/layout/data-source-banner";
import { SchedulingProvider } from "@/context/scheduling-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchedulingProvider>
      <AppShell>
        <DataSourceBanner />
        {children}
      </AppShell>
    </SchedulingProvider>
  );
}
