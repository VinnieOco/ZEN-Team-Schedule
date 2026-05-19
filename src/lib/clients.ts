import type { Client, Project } from "@/types";

export interface ClientSummary {
  /** Normalized name used for grouping and route lookup */
  key: string;
  displayName: string;
  projects: Project[];
  activeProjectCount: number;
  totalBudgetedHours: number;
  totalProjectAmount: number;
  address?: string;
  phone?: string;
  email?: string;
  /** True when contact fields differ across this client's projects */
  contactVaries: boolean;
}

export function normalizeClientName(name: string): string {
  return name.trim().toLowerCase();
}

export function clientRouteKey(displayName: string): string {
  return encodeURIComponent(displayName.trim());
}

export function clientNameFromRouteKey(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function uniqueNonEmpty(values: (string | undefined)[]): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])];
}

function pickPrimaryProject(projects: Project[]): Project {
  const active = projects.filter((p) => p.active);
  const pool = active.length > 0 ? active : projects;
  return [...pool].sort((a, b) => a.project_name.localeCompare(b.project_name))[0];
}

function resolveContactFields(projects: Project[]): Pick<
  ClientSummary,
  "address" | "phone" | "email" | "contactVaries"
> {
  const addresses = uniqueNonEmpty(projects.map((p) => p.address));
  const phones = uniqueNonEmpty(projects.map((p) => p.phone));
  const emails = uniqueNonEmpty(projects.map((p) => p.email));
  const contactVaries =
    addresses.length > 1 || phones.length > 1 || emails.length > 1;
  const primary = pickPrimaryProject(projects);

  return {
    address: addresses.length === 1 ? addresses[0] : primary.address?.trim() || undefined,
    phone: phones.length === 1 ? phones[0] : primary.phone?.trim() || undefined,
    email: emails.length === 1 ? emails[0] : primary.email?.trim() || undefined,
    contactVaries,
  };
}

function trimContactField(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Build registry rows for project client names not yet in the clients table. */
export function hydrateClientsFromProjects(
  projects: Project[],
  registry: Client[] = [],
): Client[] {
  const byKey = new Map(
    registry.map((client) => [normalizeClientName(client.name), client]),
  );

  for (const project of projects) {
    const key = normalizeClientName(project.client_name ?? "");
    if (!key || byKey.has(key)) continue;
    byKey.set(key, {
      id: crypto.randomUUID(),
      name: project.client_name.trim(),
      address: trimContactField(project.address),
      phone: trimContactField(project.phone),
      email: trimContactField(project.email),
    });
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** CRM list: project groupings plus registry-only clients (no projects yet). */
export function buildClientSummaries(
  projects: Project[],
  registry: Client[] = [],
  options?: { showInactive?: boolean },
): ClientSummary[] {
  const summaries = groupProjectsByClient(projects, options);
  const byKey = new Map(summaries.map((summary) => [summary.key, summary]));

  for (const client of registry) {
    const key = normalizeClientName(client.name);
    if (!key) continue;

    const existing = byKey.get(key);
    if (existing) {
      if (!existing.address && !existing.phone && !existing.email) {
        byKey.set(key, {
          ...existing,
          address: client.address,
          phone: client.phone,
          email: client.email,
        });
      }
      continue;
    }

    byKey.set(key, {
      key,
      displayName: client.name.trim(),
      projects: [],
      activeProjectCount: 0,
      totalBudgetedHours: 0,
      totalProjectAmount: 0,
      address: client.address,
      phone: client.phone,
      email: client.email,
      contactVaries: false,
    });
  }

  return [...byKey.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function clientComboboxOptions(
  projects: Project[],
  registry: Client[] = [],
): { value: string; label: string; keywords?: string }[] {
  return buildClientSummaries(projects, registry, { showInactive: true }).map((client) => ({
    value: client.displayName,
    label: client.displayName,
    keywords: [
      client.address,
      client.phone,
      client.email,
      client.projects.length > 1 ? `${client.projects.length} projects` : "",
    ]
      .filter(Boolean)
      .join(" "),
  }));
}

export function groupProjectsByClient(
  projects: Project[],
  options?: { showInactive?: boolean },
): ClientSummary[] {
  const showInactive = options?.showInactive ?? false;
  const eligible = showInactive ? projects : projects.filter((p) => p.active);

  const byKey = new Map<string, Project[]>();
  for (const project of eligible) {
    const key = normalizeClientName(project.client_name ?? "");
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(project);
    byKey.set(key, list);
  }

  const summaries: ClientSummary[] = [];
  for (const [key, clientProjects] of byKey) {
    const sorted = [...clientProjects].sort((a, b) =>
      a.project_name.localeCompare(b.project_name),
    );
    const displayName =
      pickPrimaryProject(sorted).client_name?.trim() ||
      clientProjects[0].client_name?.trim() ||
      "Unknown client";
    const contact = resolveContactFields(sorted);

    summaries.push({
      key,
      displayName,
      projects: sorted,
      activeProjectCount: sorted.filter((p) => p.active).length,
      totalBudgetedHours: sorted.reduce((sum, p) => sum + p.budgeted_design_hours, 0),
      totalProjectAmount: sorted.reduce(
        (sum, p) => sum + (p.project_amount ?? p.estimated_construction_value ?? 0),
        0,
      ),
      ...contact,
    });
  }

  return summaries.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export interface ClientContactFields {
  address?: string;
  phone?: string;
  email?: string;
}

export function withClientRegistryContact(
  client: Client,
  contact: ClientContactFields,
): Client {
  return {
    ...client,
    address: trimContactField(contact.address),
    phone: trimContactField(contact.phone),
    email: trimContactField(contact.email),
  };
}

/** Apply shared contact fields to a project (other project fields unchanged). */
export function withClientContact(project: Project, contact: ClientContactFields): Project {
  return {
    ...project,
    address: trimContactField(contact.address),
    phone: trimContactField(contact.phone),
    email: trimContactField(contact.email),
  };
}

export function projectsForClientKey(projects: Project[], clientKey: string): Project[] {
  const key = normalizeClientName(clientKey);
  if (!key) return [];
  return projects.filter((p) => normalizeClientName(p.client_name ?? "") === key);
}

/** Contact info from existing projects for a client name (case-insensitive). */
export function getClientContactFromProjects(
  projects: Project[],
  clientName: string,
  options?: { excludeProjectId?: string },
): ClientContactFields | undefined {
  const key = normalizeClientName(clientName);
  if (!key) return undefined;

  const clientProjects = projects.filter(
    (p) =>
      normalizeClientName(p.client_name ?? "") === key &&
      p.id !== options?.excludeProjectId,
  );
  if (clientProjects.length === 0) return undefined;

  const { address, phone, email } = resolveContactFields(clientProjects);
  if (!address && !phone && !email) return undefined;
  return { address, phone, email };
}

export function getClientContactFromRegistry(
  registry: Client[],
  clientName: string,
): ClientContactFields | undefined {
  const key = normalizeClientName(clientName);
  if (!key) return undefined;

  const client = registry.find((c) => normalizeClientName(c.name) === key);
  if (!client) return undefined;

  const contact = {
    address: client.address,
    phone: client.phone,
    email: client.email,
  };
  if (!contact.address && !contact.phone && !contact.email) return undefined;
  return contact;
}

/** Contact from projects first, then CRM client registry. */
export function getClientContact(
  projects: Project[],
  registry: Client[],
  clientName: string,
  options?: { excludeProjectId?: string },
): ClientContactFields | undefined {
  return (
    getClientContactFromProjects(projects, clientName, options) ??
    getClientContactFromRegistry(registry, clientName)
  );
}

export function findClientByRouteKey(
  projects: Project[],
  routeKey: string,
  registry: Client[] = [],
): ClientSummary | undefined {
  const name = clientNameFromRouteKey(routeKey);
  const key = normalizeClientName(name);
  if (!key) return undefined;

  const clientProjects = projects.filter(
    (p) => normalizeClientName(p.client_name ?? "") === key,
  );
  if (clientProjects.length > 0) {
    return groupProjectsByClient(clientProjects, { showInactive: true })[0];
  }

  const client = registry.find((c) => normalizeClientName(c.name) === key);
  if (!client) return undefined;

  return {
    key,
    displayName: client.name.trim(),
    projects: [],
    activeProjectCount: 0,
    totalBudgetedHours: 0,
    totalProjectAmount: 0,
    address: client.address,
    phone: client.phone,
    email: client.email,
    contactVaries: false,
  };
}

export function findRegistryClientByName(
  registry: Client[],
  clientName: string,
): Client | undefined {
  const key = normalizeClientName(clientName);
  if (!key) return undefined;
  return registry.find((c) => normalizeClientName(c.name) === key);
}
