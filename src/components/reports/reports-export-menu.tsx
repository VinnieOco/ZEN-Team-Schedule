"use client";

import { Download } from "lucide-react";

import { useReportsExportContext } from "@/components/reports/use-reports-export-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReportsPeriod } from "@/lib/reports-export";
import {
  exportAllReportsCsv,
  exportAllocationsDetailCsv,
  exportProjectBudgetCsv,
  exportScheduledVsActualCsv,
  exportTeamUtilizationCsv,
  exportTimeEntriesDetailCsv,
} from "@/lib/reports-export";

interface ReportsExportMenuProps {
  period: ReportsPeriod;
}

export function ReportsExportMenu({ period }: ReportsExportMenuProps) {
  const ctx = useReportsExportContext(period);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download />
          Export CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Download reports</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => exportTeamUtilizationCsv(ctx)}>
          Team utilization
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportScheduledVsActualCsv(ctx)}>
          Scheduled vs actual
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportProjectBudgetCsv(ctx)}>
          Project budget
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => exportAllocationsDetailCsv(ctx)}>
          Allocation line items
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportTimeEntriesDetailCsv(ctx)}>
          Time entry line items
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => exportAllReportsCsv(ctx)}>
          All of the above
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
