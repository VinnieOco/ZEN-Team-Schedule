import { addDays, addMonths, format, parseISO, subDays, subMonths } from "date-fns";

import type { InclusiveDateRange } from "@/lib/data/list-all-rows";

/** How far back to load allocations / time entries on first refresh. */
export const OPERATIONAL_LOOKBACK_MONTHS = 12;
/** How far forward to load (future schedule). */
export const OPERATIONAL_LOOKAHEAD_MONTHS = 6;
/** When the visible month approaches an edge, fetch another chunk this wide. */
export const OPERATIONAL_EXPAND_CHUNK_MONTHS = 6;

export function formatOperationalDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function defaultOperationalDateRange(anchor: Date = new Date()): InclusiveDateRange {
  return {
    from: formatOperationalDate(subMonths(anchor, OPERATIONAL_LOOKBACK_MONTHS)),
    to: formatOperationalDate(addMonths(anchor, OPERATIONAL_LOOKAHEAD_MONTHS)),
  };
}

/**
 * If `anchor` sits near or outside the loaded range, return the contiguous
 * slice to fetch next (and the expanded full range). Otherwise null.
 */
export function nextOperationalExpand(
  loaded: InclusiveDateRange,
  anchor: Date,
): { fetch: InclusiveDateRange; nextLoaded: InclusiveDateRange } | null {
  const edgeBufferMonths = 1;
  const needFrom = formatOperationalDate(subMonths(anchor, edgeBufferMonths));
  const needTo = formatOperationalDate(addMonths(anchor, edgeBufferMonths));

  if (needFrom < loaded.from) {
    const fetchFrom = formatOperationalDate(
      subMonths(parseISO(loaded.from), OPERATIONAL_EXPAND_CHUNK_MONTHS),
    );
    const fetchTo = formatOperationalDate(subDays(parseISO(loaded.from), 1));
    if (fetchTo < fetchFrom) return null;
    return {
      fetch: { from: fetchFrom, to: fetchTo },
      nextLoaded: { from: fetchFrom, to: loaded.to },
    };
  }

  if (needTo > loaded.to) {
    const fetchFrom = formatOperationalDate(addDays(parseISO(loaded.to), 1));
    const fetchTo = formatOperationalDate(
      addMonths(parseISO(loaded.to), OPERATIONAL_EXPAND_CHUNK_MONTHS),
    );
    if (fetchTo < fetchFrom) return null;
    return {
      fetch: { from: fetchFrom, to: fetchTo },
      nextLoaded: { from: loaded.from, to: fetchTo },
    };
  }

  return null;
}
