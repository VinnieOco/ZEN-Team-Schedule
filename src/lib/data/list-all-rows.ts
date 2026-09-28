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

/**
 * Apply a server list without dropping rows saved locally while the request was in flight.
 * A clean fetch (no local edits since it started) replaces the list. Otherwise local rows win,
 * server-only rows are added, and ids deleted locally stay gone.
 */
export function mergeFetchedRows<T extends { id: string }>(
  current: T[],
  server: T[],
  epochUnchanged: boolean,
  deletedIds: ReadonlySet<string>,
): T[] {
  if (epochUnchanged) return server;
  const kept = current.filter((row) => !deletedIds.has(row.id));
  const keptIds = new Set(kept.map((row) => row.id));
  const extras = server.filter((row) => !keptIds.has(row.id) && !deletedIds.has(row.id));
  return [...kept, ...extras];
}

function replaceRow<T extends { id: string }>(rows: T[], row: T): T[] {
  const index = rows.findIndex((item) => item.id === row.id);
  if (index === -1) return [...rows, row];
  return rows.map((item) => (item.id === row.id ? row : item));
}

/**
 * Keep local rows whose save has not yet been observed in a fetch that started
 * after the save finished. Confirmed ids can be dropped from the in-flight set.
 */
export function overlayUnconfirmedRows<T extends { id: string }>(
  next: T[],
  current: T[],
  server: T[],
  unconfirmedIds: ReadonlySet<string>,
  settledAt: ReadonlyMap<string, number>,
  clockAtFetchStart: number,
): { rows: T[]; confirmedIds: string[] } {
  const serverById = new Map(server.map((row) => [row.id, row]));
  const currentById = new Map(current.map((row) => [row.id, row]));
  let rows = next;
  const confirmedIds: string[] = [];

  for (const id of unconfirmedIds) {
    const serverRow = serverById.get(id);
    const settled = settledAt.get(id);
    if (serverRow && settled !== undefined && settled <= clockAtFetchStart) {
      rows = replaceRow(rows, serverRow);
      confirmedIds.push(id);
      continue;
    }
    const local = currentById.get(id);
    if (local) rows = replaceRow(rows, local);
  }

  return { rows, confirmedIds };
}
