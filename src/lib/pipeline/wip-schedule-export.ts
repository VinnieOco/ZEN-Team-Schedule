import { downloadCsv, rowsToCsv } from "@/lib/csv-export";
import {
  formatWipPercent,
  groupWipRowsByDepartment,
  sumWipScheduleRows,
  type WipScheduleRow,
  type WipScheduleTotals,
} from "@/lib/pipeline/wip-schedule";

export const WIP_SCHEDULE_CSV_HEADERS = [
  "Department",
  "Row",
  "Job Name",
  "Client",
  "Active",
  "Contract Price incl. COs",
  "Est. Cost to Complete",
  "Cost to Date",
  "Est. Total Cost",
  "% Complete",
  "Est. Gross Profit",
  "Est. GP %",
  "Revenue Earned to Date",
  "Earned GP to Date",
  "Billings to Date",
  "GP to Date",
  "GP % to Date",
  "Underbillings",
  "Overbillings",
  "Provision for Loss",
  "Prior FY Revenue",
  "Prior FY Cost",
  "Prior FY Earnings",
  "FY Revenue",
  "FY Cost",
  "FY Earnings",
  "Remaining Revenue",
  "Cost to Complete",
  "Est. Remaining GP",
] as const;

function csvMoney(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value));
}

function csvPercent(value: number | null): string {
  return formatWipPercent(value);
}

function totalsCells(totals: WipScheduleTotals): string[] {
  return [
    csvMoney(totals.contractPrice),
    csvMoney(totals.estimatedCostToComplete),
    csvMoney(totals.costToDate),
    csvMoney(totals.estimatedTotalCost),
    csvPercent(totals.percentComplete),
    csvMoney(totals.estimatedGrossProfit),
    csvPercent(totals.estimatedGrossProfitPercent),
    csvMoney(totals.revenueEarnedToDate),
    csvMoney(totals.earnedGrossProfitToDate),
    csvMoney(totals.billingsToDate),
    csvMoney(totals.grossProfitToDate),
    csvPercent(totals.grossProfitPercentToDate),
    csvMoney(totals.costsAndEarningsOverBillings),
    csvMoney(totals.billingsOverCostsAndEarnings),
    csvMoney(totals.provisionForLoss),
    csvMoney(totals.priorFyRevenue),
    csvMoney(totals.priorFyCost),
    csvMoney(totals.priorFyGrossEarnings),
    csvMoney(totals.thisFyRevenue),
    csvMoney(totals.thisFyCost),
    csvMoney(totals.thisFyGrossEarnings),
    csvMoney(totals.remainingRevenue),
    csvMoney(totals.backlogCostToComplete),
    csvMoney(totals.backlogEstimatedGrossProfit),
  ];
}

function jobCells(row: WipScheduleRow): string[] {
  return [
    row.department,
    "Job",
    row.jobName,
    row.clientName,
    row.active ? "Yes" : "No",
    ...totalsCells(row),
  ];
}

/** Build CSV content for a WIP schedule as-of month, including department and grand totals. */
export function buildWipScheduleCsv(rows: WipScheduleRow[]): string {
  const sections = groupWipRowsByDepartment(rows);
  const csvRows: string[][] = [];

  for (const section of sections) {
    for (const row of section.rows) {
      csvRows.push(jobCells(row));
    }
    csvRows.push([
      section.department,
      "Department totals",
      `${section.department} totals`,
      "",
      "",
      ...totalsCells(section.totals),
    ]);
  }

  if (rows.length > 0) {
    csvRows.push([
      "",
      "Grand totals",
      "Grand totals",
      "",
      "",
      ...totalsCells(sumWipScheduleRows(rows)),
    ]);
  }

  return rowsToCsv([...WIP_SCHEDULE_CSV_HEADERS], csvRows);
}

export function exportWipScheduleCsv(asOfMonth: string, rows: WipScheduleRow[]): void {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asOfMonth) ? asOfMonth : "unknown";
  downloadCsv(`wip-schedule_${month}.csv`, buildWipScheduleCsv(rows));
}
