import { isParentProject, getParentProject, getProjectBudgetRollup } from "@/lib/change-orders";
import type { Client, ClientNote, Estimate, Lead, Project } from "@/types";

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

export interface GroupProjectsByClientOptions {
  showInactive?: boolean;
  /** Full project list for change-order rollups (defaults to `projects`). */
  allProjects?: Project[];
  estimates?: Estimate[];
}

/**
 * Sum parent job values for a client using the same rollup logic as the project
 * detail page: contracts + CO estimates when present, otherwise design amounts
 * (including CO design fees). Change orders nested under a parent are not
 * double-counted.
 */
export function getClientTotalProjectValue(
  clientProjects: Project[],
  allProjects: Project[],
  estimates: Estimate[] = [],
): number {
  const clientProjectIds = new Set(clientProjects.map((project) => project.id));
  let total = 0;

  for (const project of clientProjects) {
    if (!isParentProject(project)) {
      const parent = getParentProject(allProjects, project);
      if (parent && clientProjectIds.has(parent.id)) continue;
    }

    const rollup = getProjectBudgetRollup(allProjects, project, estimates);
    const value =
      rollup.totalEstimateAmount > 0
        ? rollup.totalEstimateAmount
        : rollup.totalDesignAmount;
    total += value;
  }

  return total;
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
    if (!isParentProject(project)) continue;
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
  options?: GroupProjectsByClientOptions,
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
  options?: GroupProjectsByClientOptions,
): ClientSummary[] {
  const showInactive = options?.showInactive ?? false;
  const allProjects = options?.allProjects ?? projects;
  const estimates = options?.estimates ?? [];
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
      activeProjectCount: sorted.filter((p) => p.active && isParentProject(p)).length,
      totalBudgetedHours: sorted.reduce((sum, p) => sum + p.budgeted_design_hours, 0),
      totalProjectAmount: getClientTotalProjectValue(sorted, allProjects, estimates),
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
  leads: Lead[] = [],
  estimates: Estimate[] = [],
): ClientSummary | undefined {
  const name = clientNameFromRouteKey(routeKey);
  const key = normalizeClientName(name);
  if (!key) return undefined;

  const clientProjects = projects.filter(
    (p) => normalizeClientName(p.client_name ?? "") === key,
  );
  if (clientProjects.length > 0) {
    const summary = groupProjectsByClient(clientProjects, {
      showInactive: true,
      allProjects: projects,
      estimates,
    })[0];
    const registryClient = registry.find((c) => normalizeClientName(c.name) === key);
    if (
      summary &&
      registryClient &&
      !summary.address &&
      !summary.phone &&
      !summary.email
    ) {
      return {
        ...summary,
        address: registryClient.address,
        phone: registryClient.phone,
        email: registryClient.email,
      };
    }
    return summary;
  }

  const client = registry.find((c) => normalizeClientName(c.name) === key);
  if (client) {
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

  // Lead-only clients (not yet in registry / projects) still open a CRM detail page.
  const matchingLeads = leads.filter(
    (lead) => normalizeClientName(lead.client_name) === key,
  );
  if (matchingLeads.length === 0) return undefined;

  const withContact =
    matchingLeads.find(
      (lead) =>
        lead.contact_phone?.trim() ||
        lead.contact_email?.trim() ||
        lead.address?.trim(),
    ) ?? matchingLeads[0];

  return {
    key,
    displayName: withContact.client_name.trim(),
    projects: [],
    activeProjectCount: 0,
    totalBudgetedHours: 0,
    totalProjectAmount: 0,
    address: withContact.address?.trim() || undefined,
    phone: withContact.contact_phone?.trim() || undefined,
    email: withContact.contact_email?.trim() || undefined,
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

export function clientExists(
  projects: Project[],
  registry: Client[],
  clientKey: string,
): boolean {
  const key = normalizeClientName(clientKey);
  if (!key) return false;
  return (
    registry.some((c) => normalizeClientName(c.name) === key) ||
    projects.some((p) => normalizeClientName(p.client_name ?? "") === key)
  );
}

/** Canonical display name for a client key from projects or registry. */
export function getClientDisplayName(
  projects: Project[],
  registry: Client[],
  clientKey: string,
): string | undefined {
  const key = normalizeClientName(clientKey);
  if (!key) return undefined;

  const clientProjects = projectsForClientKey(projects, key);
  if (clientProjects.length > 0) {
    return (
      pickPrimaryProject(clientProjects).client_name?.trim() ||
      clientProjects[0].client_name?.trim()
    );
  }

  return findRegistryClientByName(registry, key)?.name.trim();
}

export type ClientNameActionResult =
  | { ok: true; routeKey: string; displayName: string }
  | { ok: false; message: string };

type ClientRenameValidation =
  | { ok: false; message: string }
  | { ok: true; sourceKey: string; newKey: string; newName: string };

type ClientMergeValidation =
  | { ok: false; message: string }
  | { ok: true; sourceKey: string; targetKey: string; targetDisplayName: string };

export function validateClientRename(
  sourceKey: string,
  newName: string,
  projects: Project[],
  registry: Client[],
): ClientRenameValidation {
  const source = normalizeClientName(sourceKey);
  const trimmedName = newName.trim();
  const newKey = normalizeClientName(trimmedName);

  if (!source) {
    return { ok: false, message: "Client not found." };
  }
  if (!newKey) {
    return { ok: false, message: "Client name is required." };
  }
  if (!clientExists(projects, registry, source)) {
    return { ok: false, message: "Client not found." };
  }

  if (newKey !== source && clientExists(projects, registry, newKey)) {
    return {
      ok: false,
      message: "A client with this name already exists. Use merge to combine clients.",
    };
  }

  return { ok: true, sourceKey: source, newKey, newName: trimmedName };
}

export function validateClientMerge(
  sourceKey: string,
  targetKey: string,
  projects: Project[],
  registry: Client[],
): ClientMergeValidation {
  const source = normalizeClientName(sourceKey);
  const target = normalizeClientName(targetKey);

  if (!source || !target) {
    return { ok: false, message: "Select a client to merge into." };
  }
  if (source === target) {
    return { ok: false, message: "Cannot merge a client with itself." };
  }
  if (!clientExists(projects, registry, source)) {
    return { ok: false, message: "Source client not found." };
  }
  if (!clientExists(projects, registry, target)) {
    return { ok: false, message: "Target client not found." };
  }

  const targetDisplayName = getClientDisplayName(projects, registry, target);
  if (!targetDisplayName) {
    return { ok: false, message: "Target client not found." };
  }

  return { ok: true, sourceKey: source, targetKey: target, targetDisplayName };
}

export interface MergeRegistryResult {
  clients: Client[];
  deleteClientIds: string[];
  upsertClients: Client[];
}

/** Resolve registry rows after merging source into target. */
export function mergeClientRegistry(
  registry: Client[],
  sourceKey: string,
  targetKey: string,
  targetDisplayName: string,
): MergeRegistryResult {
  const sourceReg = findRegistryClientByName(registry, sourceKey);
  const targetReg = findRegistryClientByName(registry, targetKey);

  if (!sourceReg) {
    if (!targetReg) {
      return { clients: registry, deleteClientIds: [], upsertClients: [] };
    }
    return { clients: registry, deleteClientIds: [], upsertClients: [] };
  }

  if (!targetReg) {
    const rekeyed = withClientRegistryContact(
      { ...sourceReg, name: targetDisplayName },
      sourceReg,
    );
    return {
      clients: registry.map((c) => (c.id === sourceReg.id ? rekeyed : c)),
      deleteClientIds: [],
      upsertClients: [rekeyed],
    };
  }

  if (sourceReg.id === targetReg.id) {
    return { clients: registry, deleteClientIds: [], upsertClients: [] };
  }

  const mergedTarget = withClientRegistryContact(targetReg, {
    address: targetReg.address || sourceReg.address,
    phone: targetReg.phone || sourceReg.phone,
    email: targetReg.email || sourceReg.email,
  });

  return {
    clients: registry
      .filter((c) => c.id !== sourceReg.id)
      .map((c) => (c.id === targetReg.id ? mergedTarget : c)),
    deleteClientIds: [sourceReg.id],
    upsertClients: [mergedTarget],
  };
}

export function renameClientRegistry(
  registry: Client[],
  sourceKey: string,
  newName: string,
): { clients: Client[]; upsertClients: Client[] } {
  const sourceReg = findRegistryClientByName(registry, sourceKey);
  if (!sourceReg) {
    return { clients: registry, upsertClients: [] };
  }

  const renamed = withClientRegistryContact({ ...sourceReg, name: newName }, sourceReg);
  return {
    clients: registry.map((c) => (c.id === sourceReg.id ? renamed : c)),
    upsertClients: [renamed],
  };
}

export function rekeyClientNotes(
  notes: ClientNote[],
  sourceKey: string,
  targetKey: string,
): ClientNote[] {
  const source = normalizeClientName(sourceKey);
  const target = normalizeClientName(targetKey);
  if (!source || !target || source === target) return notes;

  const now = new Date().toISOString();
  return notes.map((note) =>
    normalizeClientName(note.client_key) === source
      ? { ...note, client_key: target, updated_at: now }
      : note,
  );
}

export function moveProjectsToClientName(
  projects: Project[],
  sourceKey: string,
  targetDisplayName: string,
): Project[] {
  const source = normalizeClientName(sourceKey);
  if (!source) return projects;

  return projects.map((project) =>
    normalizeClientName(project.client_name ?? "") === source
      ? { ...project, client_name: targetDisplayName }
      : project,
  );
}
