import type { ClientSummary } from "@/lib/clients";

export interface ClientFilters {
  search: string;
  showInactive: boolean;
}

export const defaultClientFilters = (): ClientFilters => ({
  search: "",
  showInactive: false,
});

export function clientFiltersActive(filters: ClientFilters): boolean {
  return Boolean(filters.search.trim()) || filters.showInactive;
}

export function filterClients(clients: ClientSummary[], filters: ClientFilters): ClientSummary[] {
  const query = filters.search.trim().toLowerCase();

  return clients.filter((client) => {
    if (!filters.showInactive && client.activeProjectCount === 0) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      client.displayName,
      client.address,
      client.phone,
      client.email,
      ...client.projects.map((p) => p.project_name),
      ...client.projects.map((p) => p.project_number),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
