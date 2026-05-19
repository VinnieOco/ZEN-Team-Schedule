import { cn } from "@/lib/utils";

interface AppPageProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard page shell: prevents horizontal bounce and contains wide content on mobile. */
export function AppPage({ children, className }: AppPageProps) {
  return (
    <div className={cn("app-page min-w-0 max-w-full space-y-4 p-4 md:space-y-6 md:p-6", className)}>
      {children}
    </div>
  );
}
