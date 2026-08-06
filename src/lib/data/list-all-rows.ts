import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST/Supabase defaults to max 1000 rows per request — page through the rest. */
export const PAGE_SIZE = 1000;

export type OrderSpec = { column: string; ascending?: boolean };

export type DateColumnRange = {
  column: string;
  /** Inclusive lower bound (e.g. YYYY-MM-DD). */
  gte?: string;
  /** Inclusive upper bound (e.g. YYYY-MM-DD). */
  lte?: string;
};

/**
 * Fetch every row from a table, paging past the PostgREST 1000-row default.
 * Optional date-column bounds keep large operational tables (allocations,
 * time_entries) from loading the full history into the browser.
 */
export async function listAllRows(
  supabase: SupabaseClient,
  table: string,
  orders: OrderSpec[],
  dateRange?: DateColumnRange,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  for (;;) {
    let query = supabase.from(table).select("*");
    if (dateRange?.gte) {
      query = query.gte(dateRange.column, dateRange.gte);
    }
    if (dateRange?.lte) {
      query = query.lte(dateRange.column, dateRange.lte);
    }
    for (const order of orders) {
      query = query.order(order.column, { ascending: order.ascending ?? true });
    }
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as Record<string, unknown>[];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export type InclusiveDateRange = {
  from: string;
  to: string;
};

export function mergeById<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return previous;
  const map = new Map(previous.map((row) => [row.id, row]));
  for (const row of incoming) {
    map.set(row.id, row);
  }
  return Array.from(map.values());
}
