import { cn } from "@/lib/utils";

/**
 * Fixed column templates for Pipeline main-table priority groups.
 * Each owner/PM section is a separate <table>; without table-fixed + matching
 * col widths, columns drift as you scroll between groups.
 */
export function PriorityColGroup({ widths }: { widths: readonly string[] }) {
  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );
}

/** Leads: Priority | Lead | Client | Source | Created | Follow-up | Status | Value | Actions? */
export function leadsPriorityColWidths(includeActions: boolean): string[] {
  return [
    "56px",
    "20%",
    "16%",
    "12%",
    "10%",
    "12%",
    "12%",
    "96px",
    ...(includeActions ? ["44px"] : []),
  ];
}

/** Design: Priority | Project | Client | Phase | Milestone | Due | Hours | Status | Health | Actions? */
export function designPriorityColWidths(includeActions: boolean): string[] {
  return [
    "56px",
    "18%",
    "13%",
    "12%",
    "10%",
    "10%",
    "80px",
    "11%",
    "10%",
    ...(includeActions ? ["44px"] : []),
  ];
}

/** Estimating: Priority | Project | Client | Type | Received | Milestone | Due | Status | Value | Actions? */
export function estimatingPriorityColWidths(includeActions: boolean): string[] {
  return [
    "56px",
    "18%",
    "13%",
    "11%",
    "10%",
    "10%",
    "10%",
    "11%",
    "96px",
    ...(includeActions ? ["44px"] : []),
  ];
}

/** Construction: Accent | Project | Phase | Contract $ | Due | Health */
export const CONSTRUCTION_PRIORITY_COL_WIDTHS = [
  "28px",
  "34%",
  "16%",
  "14%",
  "14%",
  "14%",
] as const;

export function priorityHeadClass(extra?: string) {
  return cn("px-3", extra);
}

export function priorityCellClass(extra?: string) {
  return cn("px-3 py-3 align-middle", extra);
}
