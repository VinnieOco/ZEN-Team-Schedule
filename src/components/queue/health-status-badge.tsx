import { Badge } from "@/components/ui/badge";
import { healthLabel } from "@/lib/queue/health";
import type { QueueHealth } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

const HEALTH_STYLES: Record<QueueHealth, string> = {
  on_track: "bg-emerald-100 text-emerald-800",
  at_risk: "bg-amber-100 text-amber-900",
  overdue: "bg-red-100 text-red-800",
  blocked: "bg-slate-200 text-slate-800",
};

interface HealthStatusBadgeProps {
  health: QueueHealth;
  className?: string;
}

export function HealthStatusBadge({ health, className }: HealthStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-normal", HEALTH_STYLES[health], className)}>
      {healthLabel(health)}
    </Badge>
  );
}
