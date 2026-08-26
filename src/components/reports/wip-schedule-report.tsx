"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { exportWipScheduleCsv } from "@/lib/pipeline/wip-schedule-export";
import {
  buildConstructionWipRows,
  formatWipMoney,
  sumWipScheduleRows,
  wipScheduleJobs,
} from "@/lib/pipeline/wip-schedule";
import { buildPipelineJobs } from "@/lib/pipeline/stages";

export function WipScheduleReport() {
  const {
    projects,
    estimates,
    timeEntries,
    projectWipSnapshots,
    getEmployeeById,
  } = useScheduling();
  const [asOfMonth, setAsOfMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [includeInactive, setIncludeInactive] = useState(false);

  const jobs = useMemo(
    () =>
      buildPipelineJobs(projects, timeEntries, getEmployeeById, {
        includeInactive: true,
      }),
    [projects, timeEntries, getEmployeeById],
  );

  const wipJobs = useMemo(
    () => wipScheduleJobs(jobs, { includeInactive }),
    [jobs, includeInactive],
  );

  const rows = useMemo(
    () =>
      buildConstructionWipRows(
        wipJobs,
        projects,
        estimates,
        projectWipSnapshots,
        asOfMonth,
      ),
    [wipJobs, projects, estimates, projectWipSnapshots, asOfMonth],
  );

  const totals = useMemo(() => sumWipScheduleRows(rows), [rows]);
  const inactiveAvailable = useMemo(
    () => wipScheduleJobs(jobs, { includeInactive: true }).some((job) => !job.active),
    [jobs],
  );

  const monthLabel = (() => {
    try {
      const [year, month] = asOfMonth.split("-").map(Number);
      if (!year || !month) return asOfMonth;
      return format(new Date(year, month - 1, 1), "MMMM yyyy");
    } catch {
      return asOfMonth;
    }
  })();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>WIP schedule</CardTitle>
          <CardDescription>
            Download the Work in Progress schedule for any As-of month. Numbers match Pipeline →
            WIP.{" "}
            <Link href="/pipeline?tab=wip" className="text-emerald-700 hover:underline">
              Open WIP
            </Link>
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => exportWipScheduleCsv(asOfMonth, rows)}
          disabled={rows.length === 0}
        >
          <Download />
          Download CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full space-y-1 sm:w-44">
            <Label htmlFor="reports-wip-as-of" className="text-xs">
              As of
            </Label>
            <Input
              id="reports-wip-as-of"
              type="month"
              value={asOfMonth}
              onChange={(e) => setAsOfMonth(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
            <Switch
              id="reports-wip-inactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
              disabled={!inactiveAvailable && !includeInactive}
            />
            <Label htmlFor="reports-wip-inactive" className="cursor-pointer text-xs font-medium">
              Include inactive
            </Label>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No design or construction projects for this download.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {monthLabel}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {rows.length} job{rows.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Remaining revenue
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {formatWipMoney(totals.remainingRevenue)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Contract price
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {formatWipMoney(totals.contractPrice)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
