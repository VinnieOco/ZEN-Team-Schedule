"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import {
  buildConstructionWipRows,
  formatWipMoney,
  formatWipPercent,
  groupWipRowsByDepartment,
  sumWipScheduleRows,
  type ProjectWipInputFields,
  type WipScheduleRow,
  type WipScheduleTotals,
} from "@/lib/pipeline/wip-schedule";
import type { PipelineJob } from "@/lib/pipeline/types";
import { cn } from "@/lib/utils";

interface ConstructionWipScheduleProps {
  jobs: PipelineJob[];
  canEdit: boolean;
}

type EditableField = keyof ProjectWipInputFields;

const WIP_COL_COUNT = 25;

function MoneyCell({
  value,
  muted,
  className,
}: {
  value: number;
  muted?: boolean;
  className?: string;
}) {
  return (
    <TableCell
      className={cn(
        "whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums",
        muted && "bg-slate-50/80 text-muted-foreground",
        value < 0 && "text-rose-700",
        className,
      )}
    >
      {formatWipMoney(value)}
    </TableCell>
  );
}

function PercentCell({
  value,
  muted,
  className,
}: {
  value: number | null;
  muted?: boolean;
  className?: string;
}) {
  return (
    <TableCell
      className={cn(
        "whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums",
        muted && "bg-slate-50/80 text-muted-foreground",
        className,
      )}
    >
      {formatWipPercent(value)}
    </TableCell>
  );
}

function EditableMoneyCell({
  value,
  canEdit,
  onCommit,
}: {
  value: number;
  canEdit: boolean;
  onCommit: (next: number | undefined) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value === 0 ? "" : String(value));

  if (!canEdit) {
    return <MoneyCell value={value} />;
  }

  return (
    <TableCell className="bg-amber-50/40 px-1 py-1">
      <Input
        type="number"
        inputMode="decimal"
        step="1"
        className="h-7 border-slate-200 bg-white px-1.5 text-right text-xs tabular-nums shadow-none"
        value={display}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(value === 0 ? "" : String(value))}
        onBlur={() => {
          const raw = (draft ?? "").trim();
          setDraft(null);
          if (raw === "") {
            onCommit(undefined);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          onCommit(parsed);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </TableCell>
  );
}

function TotalsRow({
  label,
  row,
  variant = "section",
}: {
  label: string;
  row: WipScheduleTotals;
  variant?: "section" | "grand";
}) {
  const isGrand = variant === "grand";
  const rowBg = isGrand ? "bg-slate-200/90" : "bg-slate-100/90";
  const stickyBg = isGrand ? "bg-slate-200" : "bg-slate-100";

  return (
    <TableRow
      className={cn(
        "font-semibold",
        isGrand ? "border-t-2 border-slate-400" : "border-t border-slate-300",
        rowBg,
      )}
    >
      <TableCell className={cn("sticky left-0 z-10 px-3 py-2 text-xs", stickyBg)}>
        {label}
      </TableCell>
      <MoneyCell value={row.contractPrice} className={rowBg} />
      <MoneyCell value={row.estimatedCostToComplete} className={rowBg} />
      <MoneyCell value={row.costToDate} className={rowBg} />
      <MoneyCell value={row.estimatedTotalCost} muted className={rowBg} />
      <PercentCell value={row.percentComplete} muted className={rowBg} />
      <MoneyCell value={row.estimatedGrossProfit} muted className={rowBg} />
      <PercentCell value={row.estimatedGrossProfitPercent} muted className={rowBg} />
      <MoneyCell value={row.revenueEarnedToDate} muted className={rowBg} />
      <MoneyCell value={row.earnedGrossProfitToDate} muted className={rowBg} />
      <MoneyCell value={row.billingsToDate} className={rowBg} />
      <MoneyCell value={row.grossProfitToDate} muted className={rowBg} />
      <PercentCell value={row.grossProfitPercentToDate} muted className={rowBg} />
      <MoneyCell value={row.costsAndEarningsOverBillings} muted className={rowBg} />
      <MoneyCell value={row.billingsOverCostsAndEarnings} muted className={rowBg} />
      <MoneyCell value={row.provisionForLoss} className={rowBg} />
      <MoneyCell value={row.priorFyRevenue} className={rowBg} />
      <MoneyCell value={row.priorFyCost} className={rowBg} />
      <MoneyCell value={row.priorFyGrossEarnings} muted className={rowBg} />
      <MoneyCell value={row.thisFyRevenue} muted className={rowBg} />
      <MoneyCell value={row.thisFyCost} muted className={rowBg} />
      <MoneyCell value={row.thisFyGrossEarnings} muted className={rowBg} />
      <MoneyCell value={row.remainingRevenue} muted className={rowBg} />
      <MoneyCell value={row.backlogCostToComplete} muted className={rowBg} />
      <MoneyCell value={row.backlogEstimatedGrossProfit} muted className={rowBg} />
    </TableRow>
  );
}

function DepartmentHeaderRow({ department }: { department: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={WIP_COL_COUNT}
        className="sticky left-0 z-10 bg-emerald-50/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-900"
      >
        {department}
      </TableCell>
    </TableRow>
  );
}

function DataRow({
  row,
  canEdit,
  onPatch,
}: {
  row: WipScheduleRow;
  canEdit: boolean;
  onPatch: (field: EditableField, value: number | undefined) => void;
}) {
  return (
    <TableRow className="hover:bg-slate-50/60">
      <TableCell className="sticky left-0 z-10 bg-white px-3 py-1.5">
        <Link
          href={`/projects/${row.projectId}`}
          className="block max-w-[180px] truncate text-xs font-medium text-emerald-700 hover:underline"
          title={row.jobName}
        >
          {row.jobName}
        </Link>
        <p className="truncate text-[10px] text-muted-foreground">{row.clientName}</p>
      </TableCell>
      <MoneyCell value={row.contractPrice} muted />
      <EditableMoneyCell
        value={row.estimatedCostToComplete}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_estimated_cost_to_complete", v)}
      />
      <EditableMoneyCell
        value={row.costToDate}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_cost_to_date", v)}
      />
      <MoneyCell value={row.estimatedTotalCost} muted />
      <PercentCell value={row.percentComplete} muted />
      <MoneyCell value={row.estimatedGrossProfit} muted />
      <PercentCell value={row.estimatedGrossProfitPercent} muted />
      <MoneyCell value={row.revenueEarnedToDate} muted />
      <MoneyCell value={row.earnedGrossProfitToDate} muted />
      <EditableMoneyCell
        value={row.billingsToDate}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_billings_to_date", v)}
      />
      <MoneyCell value={row.grossProfitToDate} muted />
      <PercentCell value={row.grossProfitPercentToDate} muted />
      <MoneyCell value={row.costsAndEarningsOverBillings} muted />
      <MoneyCell value={row.billingsOverCostsAndEarnings} muted />
      <EditableMoneyCell
        value={row.provisionForLoss}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_provision_for_loss", v)}
      />
      <EditableMoneyCell
        value={row.priorFyRevenue}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_prior_fy_revenue", v)}
      />
      <EditableMoneyCell
        value={row.priorFyCost}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_prior_fy_cost", v)}
      />
      <MoneyCell value={row.priorFyGrossEarnings} muted />
      <MoneyCell value={row.thisFyRevenue} muted />
      <MoneyCell value={row.thisFyCost} muted />
      <MoneyCell value={row.thisFyGrossEarnings} muted />
      <MoneyCell value={row.remainingRevenue} muted />
      <MoneyCell value={row.backlogCostToComplete} muted />
      <MoneyCell value={row.backlogEstimatedGrossProfit} muted />
    </TableRow>
  );
}

const HEAD =
  "whitespace-nowrap px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600";

export function ConstructionWipSchedule({ jobs, canEdit }: ConstructionWipScheduleProps) {
  const { projects, estimates, updateProjectWipFields } = useScheduling();
  const [asOf, setAsOf] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const rows = useMemo(
    () => buildConstructionWipRows(jobs, projects, estimates),
    [jobs, projects, estimates],
  );
  const sections = useMemo(() => groupWipRowsByDepartment(rows), [rows]);
  const grandTotals = useMemo(() => sumWipScheduleRows(rows), [rows]);

  const asOfLabel = (() => {
    try {
      return format(new Date(`${asOf}T12:00:00`), "M/d/yy");
    } catch {
      return asOf;
    }
  })();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Work in Progress Schedule</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Grouped by department. Amber cells are entered; gray cells are calculated like the
            Excel WIP (contract $ from Contracts + change orders).
          </p>
        </div>
        <div className="w-full space-y-1 sm:w-40">
          <Label htmlFor="wip-as-of" className="text-xs">
            As of
          </Label>
          <Input
            id="wip-as-of"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          No construction projects yet. Mark an estimate as won or set a project to Construction.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[2200px] border-collapse">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead colSpan={1} className={cn(HEAD, "sticky left-0 z-20 bg-slate-100")} />
                <TableHead colSpan={15} className={cn(HEAD, "bg-slate-100 text-center")}>
                  Contract Totals
                </TableHead>
                <TableHead colSpan={3} className={cn(HEAD, "bg-sky-50 text-center")}>
                  Recognized in Prior FY(s)
                </TableHead>
                <TableHead colSpan={3} className={cn(HEAD, "bg-emerald-50 text-center")}>
                  Totals, This Fiscal Year Thru {asOfLabel}
                </TableHead>
                <TableHead colSpan={3} className={cn(HEAD, "bg-amber-50 text-center")}>
                  Future Workload (Backlog)
                </TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(HEAD, "sticky left-0 z-20 bg-white")}>Job Name</TableHead>
                <TableHead className={HEAD}>Contract Price incl. COs</TableHead>
                <TableHead className={HEAD}>Est. Cost to Complete</TableHead>
                <TableHead className={HEAD}>Cost to Date</TableHead>
                <TableHead className={HEAD}>Est. Total Cost</TableHead>
                <TableHead className={HEAD}>% Complete</TableHead>
                <TableHead className={HEAD}>Est. Gross Profit</TableHead>
                <TableHead className={HEAD}>Est. GP %</TableHead>
                <TableHead className={HEAD}>Revenue Earned to Date</TableHead>
                <TableHead className={HEAD}>Earned GP to Date</TableHead>
                <TableHead className={HEAD}>Billings to Date</TableHead>
                <TableHead className={HEAD}>GP to Date</TableHead>
                <TableHead className={HEAD}>GP % to Date</TableHead>
                <TableHead className={HEAD}>Underbillings</TableHead>
                <TableHead className={HEAD}>Overbillings</TableHead>
                <TableHead className={HEAD}>Provision for Loss</TableHead>
                <TableHead className={HEAD}>Prior FY Revenue</TableHead>
                <TableHead className={HEAD}>Prior FY Cost</TableHead>
                <TableHead className={HEAD}>Prior FY Earnings</TableHead>
                <TableHead className={HEAD}>FY Revenue</TableHead>
                <TableHead className={HEAD}>FY Cost</TableHead>
                <TableHead className={HEAD}>FY Earnings</TableHead>
                <TableHead className={HEAD}>Remaining Revenue</TableHead>
                <TableHead className={HEAD}>Cost to Complete</TableHead>
                <TableHead className={HEAD}>Est. Remaining GP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <Fragment key={section.department}>
                  <DepartmentHeaderRow department={section.department} />
                  {section.rows.map((row) => (
                    <DataRow
                      key={row.projectId}
                      row={row}
                      canEdit={canEdit}
                      onPatch={(field, value) =>
                        updateProjectWipFields(row.projectId, { [field]: value })
                      }
                    />
                  ))}
                  <TotalsRow
                    label={`${section.department} totals`}
                    row={section.totals}
                    variant="section"
                  />
                </Fragment>
              ))}
              <TotalsRow label="Grand totals" row={grandTotals} variant="grand" />
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
