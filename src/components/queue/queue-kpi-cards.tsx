import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QueueKpiSummary } from "@/lib/queue/types";

interface QueueKpiCardsProps {
  summary: QueueKpiSummary;
}

export function QueueKpiCards({ summary }: QueueKpiCardsProps) {
  const items = [
    { label: "In queue", value: String(summary.total), sub: `${summary.active} active` },
    { label: "At risk / overdue", value: String(summary.atRisk), sub: "needs attention" },
    { label: "Due soon", value: String(summary.dueSoon), sub: "within 14 days" },
    { label: "Unassigned", value: String(summary.unassigned), sub: "no project lead" },
  ];

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
