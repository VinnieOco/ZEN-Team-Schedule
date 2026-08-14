"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { endOfMonth, format, parse } from "date-fns";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  showInactive?: boolean;
  onShowInactiveChange?: (next: boolean) => void;
  inactiveAvailable?: boolean;
}

type EditableField = keyof ProjectWipInputFields;

const WIP_COL_COUNT = 25;

const cellBase = "whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums";
const HEAD =
  "whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600";

function MoneyTd({
  value,
  muted,
  className,
}: {
  value: number;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        cellBase,
        muted && "bg-slate-50/80 text-muted-foreground",
        value < 0 && "text-rose-700",
        className,
      )}
    >
      {formatWipMoney(value)}
    </td>
  );
}

function PercentTd({
  value,
  muted,
  className,
}: {
  value: number | null;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        cellBase,
        muted && "bg-slate-50/80 text-muted-foreground",
        className,
      )}
    >
      {formatWipPercent(value)}
    </td>
  );
}

function EditableMoneyTd({
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
    return <MoneyTd value={value} />;
  }

  return (
    <td className="bg-amber-50/40 px-1 py-1">
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
    </td>
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
    <tr
      className={cn(
        "font-semibold",
        isGrand ? "border-t-2 border-slate-400" : "border-t border-slate-300",
        rowBg,
      )}
    >
      <td
        className={cn(
          "sticky left-0 z-20 min-w-[160px] max-w-[200px] px-3 py-2 text-left text-xs shadow-[2px_0_4px_-2px_rgba(15,23,42,0.12)]",
          stickyBg,
        )}
      >
        {label}
      </td>
      <MoneyTd value={row.contractPrice} className={rowBg} />
      <MoneyTd value={row.estimatedCostToComplete} className={rowBg} />
      <MoneyTd value={row.costToDate} className={rowBg} />
      <MoneyTd value={row.estimatedTotalCost} muted className={rowBg} />
      <PercentTd value={row.percentComplete} muted className={rowBg} />
      <MoneyTd value={row.estimatedGrossProfit} muted className={rowBg} />
      <PercentTd value={row.estimatedGrossProfitPercent} muted className={rowBg} />
      <MoneyTd value={row.revenueEarnedToDate} muted className={rowBg} />
      <MoneyTd value={row.earnedGrossProfitToDate} muted className={rowBg} />
      <MoneyTd value={row.billingsToDate} className={rowBg} />
      <MoneyTd value={row.grossProfitToDate} muted className={rowBg} />
      <PercentTd value={row.grossProfitPercentToDate} muted className={rowBg} />
      <MoneyTd value={row.costsAndEarningsOverBillings} muted className={rowBg} />
      <MoneyTd value={row.billingsOverCostsAndEarnings} muted className={rowBg} />
      <MoneyTd value={row.provisionForLoss} className={rowBg} />
      <MoneyTd value={row.priorFyRevenue} className={rowBg} />
      <MoneyTd value={row.priorFyCost} className={rowBg} />
      <MoneyTd value={row.priorFyGrossEarnings} muted className={rowBg} />
      <MoneyTd value={row.thisFyRevenue} muted className={rowBg} />
      <MoneyTd value={row.thisFyCost} muted className={rowBg} />
      <MoneyTd value={row.thisFyGrossEarnings} muted className={rowBg} />
      <MoneyTd value={row.remainingRevenue} muted className={rowBg} />
      <MoneyTd value={row.backlogCostToComplete} muted className={rowBg} />
      <MoneyTd value={row.backlogEstimatedGrossProfit} muted className={rowBg} />
    </tr>
  );
}

function DepartmentHeaderRow({ department }: { department: string }) {
  return (
    <tr>
      <td
        colSpan={WIP_COL_COUNT}
        className="sticky left-0 z-10 bg-emerald-50/95 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-900"
      >
        {department}
      </td>
    </tr>
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
    <tr
      className={cn(
        "border-b border-slate-100 hover:bg-slate-50/60",
        !row.active && "bg-slate-50/40",
      )}
    >
      <td className="sticky left-0 z-10 min-w-[160px] max-w-[200px] bg-white px-3 py-1.5 text-left shadow-[2px_0_4px_-2px_rgba(15,23,42,0.12)]">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={`/projects/${row.projectId}`}
            className="block min-w-0 truncate text-xs font-medium text-emerald-700 hover:underline"
            title={row.jobName}
          >
            {row.jobName}
          </Link>
          {!row.active ? (
            <span className="shrink-0 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
              Inactive
            </span>
          ) : null}
        </div>
        <p className="truncate text-[10px] text-muted-foreground">{row.clientName}</p>
      </td>
      <EditableMoneyTd
        value={row.contractPrice}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_contract_price", v)}
      />
      <EditableMoneyTd
        value={row.estimatedCostToComplete}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_estimated_cost_to_complete", v)}
      />
      <EditableMoneyTd
        value={row.costToDate}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_cost_to_date", v)}
      />
      <MoneyTd value={row.estimatedTotalCost} muted />
      <PercentTd value={row.percentComplete} muted />
      <MoneyTd value={row.estimatedGrossProfit} muted />
      <PercentTd value={row.estimatedGrossProfitPercent} muted />
      <MoneyTd value={row.revenueEarnedToDate} muted />
      <MoneyTd value={row.earnedGrossProfitToDate} muted />
      <EditableMoneyTd
        value={row.billingsToDate}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_billings_to_date", v)}
      />
      <MoneyTd value={row.grossProfitToDate} muted />
      <PercentTd value={row.grossProfitPercentToDate} muted />
      <MoneyTd value={row.costsAndEarningsOverBillings} muted />
      <MoneyTd value={row.billingsOverCostsAndEarnings} muted />
      <EditableMoneyTd
        value={row.provisionForLoss}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_provision_for_loss", v)}
      />
      <EditableMoneyTd
        value={row.priorFyRevenue}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_prior_fy_revenue", v)}
      />
      <EditableMoneyTd
        value={row.priorFyCost}
        canEdit={canEdit}
        onCommit={(v) => onPatch("wip_prior_fy_cost", v)}
      />
      <MoneyTd value={row.priorFyGrossEarnings} muted />
      <MoneyTd value={row.thisFyRevenue} muted />
      <MoneyTd value={row.thisFyCost} muted />
      <MoneyTd value={row.thisFyGrossEarnings} muted />
      <MoneyTd value={row.remainingRevenue} muted />
      <MoneyTd value={row.backlogCostToComplete} muted />
      <MoneyTd value={row.backlogEstimatedGrossProfit} muted />
    </tr>
  );
}

export function ConstructionWipSchedule({
  jobs,
  canEdit,
  showInactive = false,
  onShowInactiveChange,
  inactiveAvailable = false,
}: ConstructionWipScheduleProps) {
  const { projects, estimates, projectWipSnapshots, updateProjectWipFields } = useScheduling();
  const [asOfMonth, setAsOfMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      buildConstructionWipRows(
        jobs,
        projects,
        estimates,
        projectWipSnapshots,
        asOfMonth,
      ),
    [jobs, projects, estimates, projectWipSnapshots, asOfMonth],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.jobName.toLowerCase().includes(q) ||
        row.clientName.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sections = useMemo(() => groupWipRowsByDepartment(filteredRows), [filteredRows]);
  const grandTotals = useMemo(() => sumWipScheduleRows(filteredRows), [filteredRows]);
  const inactiveCount = rows.filter((row) => !row.active).length;

  const asOfLabel = (() => {
    try {
      const monthStart = parse(`${asOfMonth}-01`, "yyyy-MM-dd", new Date());
      return format(endOfMonth(monthStart), "M/d/yy");
    } catch {
      return asOfMonth;
    }
  })();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-slate-50/80 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Work in Progress Schedule</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Amber cells are entered for the selected As-of month; gray cells are calculated.
            Scroll inside the table — headers and job names stay fixed.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto">
          <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs lg:w-64 lg:flex-none">
            <Label htmlFor="wip-search" className="text-xs">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wip-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Job, client, or department…"
                className="h-8 pl-8"
              />
            </div>
          </div>
          <div className="w-full space-y-1 sm:w-44">
            <Label htmlFor="wip-as-of" className="text-xs">
              As of
            </Label>
            <Input
              id="wip-as-of"
              type="month"
              value={asOfMonth}
              onChange={(e) => setAsOfMonth(e.target.value)}
              className="h-8"
            />
          </div>
          {onShowInactiveChange ? (
            <div className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
              <Switch
                id="wip-show-inactive"
                checked={showInactive}
                onCheckedChange={onShowInactiveChange}
                disabled={!inactiveAvailable && !showInactive}
              />
              <Label htmlFor="wip-show-inactive" className="cursor-pointer text-xs font-medium">
                Show inactive
                {inactiveAvailable || inactiveCount > 0
                  ? ` (${showInactive ? inactiveCount : "hidden"})`
                  : ""}
              </Label>
            </div>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          No design or construction projects yet.
        </p>
      ) : filteredRows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          No jobs match “{search.trim()}”.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
            <p>
              {filteredRows.length} job{filteredRows.length === 1 ? "" : "s"}
              {search.trim() ? ` matching “${search.trim()}”` : ""}
              {filteredRows.length !== rows.length ? ` of ${rows.length}` : ""}
            </p>
            <p className="hidden sm:block">Scroll horizontally and vertically in the table below</p>
          </div>
          <div
            className={cn(
              "schedule-scroll max-h-[min(70vh,760px)] overflow-auto overscroll-contain",
              "[-webkit-overflow-scrolling:touch]",
            )}
          >
            <table className="min-w-[2200px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-30">
                <tr className="border-b border-slate-200">
                  <th
                    className={cn(
                      HEAD,
                      "sticky left-0 z-40 bg-slate-100 shadow-[2px_0_4px_-2px_rgba(15,23,42,0.12)]",
                    )}
                  />
                  <th colSpan={15} className={cn(HEAD, "bg-slate-100 text-center")}>
                    Contract Totals
                  </th>
                  <th colSpan={3} className={cn(HEAD, "bg-sky-50 text-center")}>
                    Recognized in Prior FY(s)
                  </th>
                  <th colSpan={3} className={cn(HEAD, "bg-emerald-50 text-center")}>
                    Totals, This Fiscal Year Thru {asOfLabel}
                  </th>
                  <th colSpan={3} className={cn(HEAD, "bg-amber-50 text-center")}>
                    Future Workload (Backlog)
                  </th>
                </tr>
                <tr className="border-b border-slate-200">
                  <th
                    className={cn(
                      HEAD,
                      "sticky left-0 z-40 bg-white shadow-[2px_0_4px_-2px_rgba(15,23,42,0.12)]",
                    )}
                  >
                    Job Name
                  </th>
                  <th className={cn(HEAD, "bg-white")}>Contract Price incl. COs</th>
                  <th className={cn(HEAD, "bg-white")}>Est. Cost to Complete</th>
                  <th className={cn(HEAD, "bg-white")}>Cost to Date</th>
                  <th className={cn(HEAD, "bg-white")}>Est. Total Cost</th>
                  <th className={cn(HEAD, "bg-white")}>% Complete</th>
                  <th className={cn(HEAD, "bg-white")}>Est. Gross Profit</th>
                  <th className={cn(HEAD, "bg-white")}>Est. GP %</th>
                  <th className={cn(HEAD, "bg-white")}>Revenue Earned to Date</th>
                  <th className={cn(HEAD, "bg-white")}>Earned GP to Date</th>
                  <th className={cn(HEAD, "bg-white")}>Billings to Date</th>
                  <th className={cn(HEAD, "bg-white")}>GP to Date</th>
                  <th className={cn(HEAD, "bg-white")}>GP % to Date</th>
                  <th className={cn(HEAD, "bg-white")}>Underbillings</th>
                  <th className={cn(HEAD, "bg-white")}>Overbillings</th>
                  <th className={cn(HEAD, "bg-white")}>Provision for Loss</th>
                  <th className={cn(HEAD, "bg-sky-50")}>Prior FY Revenue</th>
                  <th className={cn(HEAD, "bg-sky-50")}>Prior FY Cost</th>
                  <th className={cn(HEAD, "bg-sky-50")}>Prior FY Earnings</th>
                  <th className={cn(HEAD, "bg-emerald-50")}>FY Revenue</th>
                  <th className={cn(HEAD, "bg-emerald-50")}>FY Cost</th>
                  <th className={cn(HEAD, "bg-emerald-50")}>FY Earnings</th>
                  <th className={cn(HEAD, "bg-amber-50")}>Remaining Revenue</th>
                  <th className={cn(HEAD, "bg-amber-50")}>Cost to Complete</th>
                  <th className={cn(HEAD, "bg-amber-50")}>Est. Remaining GP</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <Fragment key={section.department}>
                    <DepartmentHeaderRow department={section.department} />
                    {section.rows.map((row) => (
                      <DataRow
                        key={row.projectId}
                        row={row}
                        canEdit={canEdit}
                        onPatch={(field, value) =>
                          updateProjectWipFields(row.projectId, asOfMonth, { [field]: value })
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
                <TotalsRow
                  label={search.trim() ? "Filtered totals" : "Grand totals"}
                  row={grandTotals}
                  variant="grand"
                />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
