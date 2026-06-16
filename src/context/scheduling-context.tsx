"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addMonths, addWeeks, subMonths, subWeeks } from "date-fns";

import {
  categories as seedCategories,
  companySettings as seedSettings,
  employees as seedEmployees,
  initialAllocations,
  initialTimeEntries,
  projects as seedProjects,
} from "@/data/mock-data";
import { createQueueStatePersistence } from "@/lib/data/queue-repository";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import {
  flushPersistQueue,
  hydrateQueueState,
  initQueuePersistence,
  isQueueStateEmpty,
  loadLocalQueueSnapshot,
  migrateLocalQueueToRemote,
} from "@/lib/queue/queue-state";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SchedulingRepository } from "@/lib/repository";
import {
  appendDepartment,
  appendJobRole,
  normalizeCompanySettings,
} from "@/lib/team-options";
import {
  findRegistryClientByName,
  hydrateClientsFromProjects,
  normalizeClientName,
  projectsForClientKey,
  withClientContact,
  withClientRegistryContact,
  type ClientContactFields,
} from "@/lib/clients";
import { projectFromFormValues } from "@/lib/project-form";
import { projectsNeedingPhaseSeed, seedPhasesForProject } from "@/lib/gantt/seed-phases";
import { getMonthStart, getWeekStart } from "@/lib/week";
import type {
  Allocation,
  AllocationCategory,
  AllocationFormValues,
  CategoryFormValues,
  CompanySettings,
  Employee,
  Project,
  Client,
  ClientNote,
  ClientFormValues,
  ProjectNote,
  ProjectMilestone,
  ScheduledProjectPhase,
  EmployeeFormValues,
  ProjectFormValues,
  SchedulingFilters,
  TimeEntry,
  TimeEntryFormValues,
} from "@/types";

const STORAGE_KEY = "zen-scheduling-state";

type DataSource = "local" | "supabase";

interface PersistedState {
  employees: Employee[];
  projects: Project[];
  clients?: Client[];
  projectNotes?: ProjectNote[];
  clientNotes?: ClientNote[];
  categories?: AllocationCategory[];
  allocations: Allocation[];
  timeEntries: TimeEntry[];
  projectPhases?: ScheduledProjectPhase[];
  projectMilestones?: ProjectMilestone[];
  settings: CompanySettings;
}

interface SchedulingContextValue {
  dataSource: DataSource;
  isLoading: boolean;
  /** Bumps when queue state is loaded from DB or localStorage (for memo invalidation). */
  queueRevision: number;
  error: string | null;
  employees: Employee[];
  projects: Project[];
  clients: Client[];
  projectNotes: ProjectNote[];
  clientNotes: ClientNote[];
  categories: AllocationCategory[];
  allocations: Allocation[];
  timeEntries: TimeEntry[];
  projectPhases: ScheduledProjectPhase[];
  projectMilestones: ProjectMilestone[];
  settings: CompanySettings;
  selectedWeekStart: Date;
  filters: SchedulingFilters;
  setWeek: (date: Date) => void;
  setMonth: (date: Date) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  setFilters: (filters: Partial<SchedulingFilters>) => void;
  clearFilters: () => void;
  addAllocation: (values: AllocationFormValues) => Allocation;
  updateAllocation: (id: string, values: AllocationFormValues) => void;
  moveAllocation: (id: string, employeeId: string, allocationDate: string) => void;
  deleteAllocation: (id: string) => void;
  duplicateAllocation: (id: string) => Allocation;
  addTimeEntry: (values: TimeEntryFormValues) => TimeEntry;
  updateTimeEntry: (id: string, values: TimeEntryFormValues) => void;
  deleteTimeEntry: (id: string) => void;
  addProject: (values: ProjectFormValues) => Project;
  updateProject: (id: string, values: ProjectFormValues) => void;
  addClient: (values: ClientFormValues) => Client | { ok: false; message: string };
  /** Sync address, phone, and email to registry + every project for this client key. */
  updateClientContact: (clientKey: string, contact: ClientContactFields) => void;
  addProjectNote: (projectId: string, body: string) => void;
  updateProjectNote: (id: string, body: string) => void;
  deleteProjectNote: (id: string) => void;
  addClientNote: (clientKey: string, body: string) => void;
  updateClientNote: (id: string, body: string) => void;
  deleteClientNote: (id: string) => void;
  updateSettings: (settings: Partial<CompanySettings>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  addEmployee: (values: EmployeeFormValues) => Employee;
  updateEmployeeFromForm: (id: string, values: EmployeeFormValues) => void;
  deleteEmployee: (id: string) => { ok: true } | { ok: false; message: string };
  addCategory: (values: CategoryFormValues) => AllocationCategory | null;
  deleteCategory: (id: string) => { ok: true } | { ok: false; message: string };
  getCategoryById: (id: string) => AllocationCategory | undefined;
  getProjectById: (id: string) => Project | undefined;
  getEmployeeById: (id: string) => Employee | undefined;
  replaceProjectPhases: (projectId: string, phases: ScheduledProjectPhase[]) => void;
  replaceProjectMilestones: (projectId: string, milestones: ProjectMilestone[]) => void;
  seedMissingProjectPhases: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null);

function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

function getPersistErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string };
    const parts = [e.message, e.details, e.hint].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );
    if (parts.length > 0) return parts.join(" — ");
  }
  if (err instanceof Error) return err.message;
  return "Save failed";
}

function buildAllocation(values: AllocationFormValues, id?: string): Allocation {
  return {
    id: id ?? generateId(),
    employee_id: values.employee_id,
    project_id: values.project_id,
    allocation_category_id: values.allocation_category_id,
    allocation_date: values.allocation_date,
    hours: values.hours,
    is_billable: values.is_billable,
    phase: values.phase,
    task_name: values.task_name || undefined,
    notes: values.notes,
  };
}

function buildTimeEntry(values: TimeEntryFormValues, id?: string): TimeEntry {
  return {
    id: id ?? generateId(),
    employee_id: values.employee_id,
    project_id: values.project_id,
    allocation_category_id: values.allocation_category_id,
    entry_date: values.entry_date,
    hours: values.hours,
    is_billable: values.is_billable,
    phase: values.phase,
    task_name: values.task_name || undefined,
    notes: values.notes,
    class_code: values.class_code?.trim() || undefined,
  };
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const useSupabase = isSupabaseConfigured();
  const repoRef = useRef<SchedulingRepository | null>(null);

  const persisted = !useSupabase ? loadPersistedState() : null;

  const [dataSource] = useState<DataSource>(useSupabase ? "supabase" : "local");
  const [isLoading, setIsLoading] = useState(useSupabase);
  const [queueRevision, setQueueRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Supabase: start empty so seed/demo data never flashes before refreshData().
  const [employees, setEmployees] = useState<Employee[]>(
    useSupabase ? [] : (persisted?.employees ?? seedEmployees),
  );
  const [projects, setProjects] = useState<Project[]>(
    useSupabase ? [] : (persisted?.projects ?? seedProjects),
  );
  const [clients, setClients] = useState<Client[]>(() => {
    if (useSupabase) return [];
    return hydrateClientsFromProjects(
      persisted?.projects ?? seedProjects,
      persisted?.clients ?? [],
    );
  });
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>(
    useSupabase ? [] : (persisted?.projectNotes ?? []),
  );
  const [clientNotes, setClientNotes] = useState<ClientNote[]>(
    useSupabase ? [] : (persisted?.clientNotes ?? []),
  );
  const [categories, setCategories] = useState<AllocationCategory[]>(
    useSupabase
      ? []
      : persisted?.categories?.length
        ? persisted.categories
        : seedCategories,
  );
  const [allocations, setAllocations] = useState<Allocation[]>(
    useSupabase ? [] : (persisted?.allocations ?? initialAllocations),
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(
    useSupabase ? [] : (persisted?.timeEntries ?? initialTimeEntries),
  );
  const [projectPhases, setProjectPhases] = useState<ScheduledProjectPhase[]>(
    useSupabase ? [] : (persisted?.projectPhases ?? []),
  );
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>(
    useSupabase ? [] : (persisted?.projectMilestones ?? []),
  );
  const [settings, setSettings] = useState<CompanySettings>(() =>
    normalizeCompanySettings(persisted?.settings ?? seedSettings),
  );
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() =>
    getWeekStart(new Date(), seedSettings),
  );
  const [filters, setFiltersState] = useState<SchedulingFilters>({
    search: "",
    department: null,
    projectId: null,
    categoryId: null,
    showHours: true,
    onlyWithAllocations: false,
  });

  const refreshData = useCallback(async () => {
    if (!useSupabase) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      repoRef.current = createSupabaseRepository(supabase);
      const repo = repoRef.current;
      const [emp, proj, notes, cats, alloc, times, sett] = await Promise.all([
        repo.listEmployees(),
        repo.listProjects(),
        repo.listProjectNotes(),
        repo.listCategories(),
        repo.listAllocations(),
        repo.listTimeEntries(),
        repo.getSettings(),
      ]);

      let clientNotesData: ClientNote[] = [];
      try {
        clientNotesData = await repo.listClientNotes();
      } catch {
        // Table may be missing until migration 20260518140000_client_notes.sql is applied.
        clientNotesData = [];
      }

      let clientsData: Client[] = [];
      try {
        clientsData = await repo.listClients();
      } catch {
        clientsData = hydrateClientsFromProjects(proj, []);
      }

      setEmployees(emp);
      setProjects(proj);
      setClients(hydrateClientsFromProjects(proj, clientsData));
      setProjectNotes(
        [...notes].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
      setClientNotes(
        [...clientNotesData].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
      setCategories(cats.length > 0 ? cats : seedCategories);
      setAllocations(alloc);
      setTimeEntries(times);
      setSettings(sett);
      setSelectedWeekStart(getWeekStart(new Date(), sett));

      try {
        const phasesData = await repo.listProjectPhases();
        setProjectPhases(phasesData);
      } catch {
        setProjectPhases([]);
      }

      try {
        const milestonesData = await repo.listProjectMilestones();
        setProjectMilestones(milestonesData);
      } catch {
        setProjectMilestones([]);
      }

      try {
        const persistence = createQueueStatePersistence(supabase);
        initQueuePersistence(persistence, { useRemote: true });
        await flushPersistQueue();
        let queueSnapshot = await repo.listQueueState();
        if (isQueueStateEmpty(queueSnapshot)) {
          await migrateLocalQueueToRemote();
          queueSnapshot = await repo.listQueueState();
        }
        hydrateQueueState(queueSnapshot);
        setQueueRevision((n) => n + 1);
      } catch {
        // Tables may be missing until migration 20260525120000_queue_state.sql is applied.
        initQueuePersistence(null, { useRemote: false });
        loadLocalQueueSnapshot();
        setQueueRevision((n) => n + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    if (useSupabase) {
      refreshData();
    }
  }, [useSupabase, refreshData]);

  useEffect(() => {
    if (useSupabase) return;
    initQueuePersistence(null, { useRemote: false });
    loadLocalQueueSnapshot();
    setQueueRevision((n) => n + 1);
  }, [useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    const payload: PersistedState = {
      employees,
      projects,
      clients,
      projectNotes,
      clientNotes,
      categories,
      allocations,
      timeEntries,
      projectPhases,
      projectMilestones,
      settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    useSupabase,
    employees,
    projects,
    clients,
    projectNotes,
    clientNotes,
    categories,
    allocations,
    timeEntries,
    projectPhases,
    projectMilestones,
    settings,
  ]);

  const persistAsync = useCallback(
    async <T,>(action: () => Promise<T>, rollback: () => void): Promise<T | undefined> => {
      if (!repoRef.current) return undefined;
      try {
        return await action();
      } catch (err) {
        rollback();
        setError(getPersistErrorMessage(err));
        return undefined;
      }
    },
    [],
  );

  const setWeek = useCallback(
    (date: Date) => {
      setSelectedWeekStart(getWeekStart(date, settings));
    },
    [settings],
  );

  const setMonth = useCallback((date: Date) => {
    setSelectedWeekStart(getMonthStart(date));
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setSelectedWeekStart((prev) => getWeekStart(subWeeks(prev, 1), settings));
  }, [settings]);

  const goToNextWeek = useCallback(() => {
    setSelectedWeekStart((prev) => getWeekStart(addWeeks(prev, 1), settings));
  }, [settings]);

  const goToPreviousMonth = useCallback(() => {
    setSelectedWeekStart((prev) => getMonthStart(subMonths(prev, 1)));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedWeekStart((prev) => getMonthStart(addMonths(prev, 1)));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedWeekStart(getWeekStart(new Date(), settings));
  }, [settings]);

  const setFilters = useCallback((partial: Partial<SchedulingFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({
      search: "",
      department: null,
      projectId: null,
      categoryId: null,
      showHours: true,
      onlyWithAllocations: false,
    });
  }, []);

  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories],
  );

  const getProjectById = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const getEmployeeById = useCallback(
    (id: string) => employees.find((e) => e.id === id),
    [employees],
  );

  const addAllocation = useCallback(
    (values: AllocationFormValues): Allocation => {
      const allocation = buildAllocation(values);
      setAllocations((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertAllocation(allocation),
            () => setAllocations(snapshot),
          ).then((saved) => {
            if (saved) {
              setAllocations((current) =>
                current.map((a) => (a.id === allocation.id ? saved : a)),
              );
            }
          });
        }
        return [...prev, allocation];
      });
      return allocation;
    },
    [persistAsync],
  );

  const updateAllocation = useCallback(
    (id: string, values: AllocationFormValues) => {
      const updated = buildAllocation(values, id);
      setAllocations((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertAllocation(updated),
            () => setAllocations(snapshot),
          );
        }
        return prev.map((a) => (a.id === id ? updated : a));
      });
    },
    [persistAsync],
  );

  const moveAllocation = useCallback(
    (id: string, employeeId: string, allocationDate: string) => {
      setAllocations((prev) => {
        const existing = prev.find((a) => a.id === id);
        if (!existing) return prev;
        if (existing.employee_id === employeeId && existing.allocation_date === allocationDate) {
          return prev;
        }
        const snapshot = prev;
        const moved: Allocation = {
          ...existing,
          employee_id: employeeId,
          allocation_date: allocationDate,
        };
        const next = prev.map((a) => (a.id === id ? moved : a));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertAllocation(moved),
            () => setAllocations(snapshot),
          );
        }
        return next;
      });
    },
    [persistAsync],
  );

  const deleteAllocation = useCallback(
    (id: string) => {
      setAllocations((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteAllocation(id),
            () => setAllocations(snapshot),
          );
        }
        return prev.filter((a) => a.id !== id);
      });
    },
    [persistAsync],
  );

  const duplicateAllocation = useCallback(
    (id: string): Allocation => {
      const source = allocations.find((a) => a.id === id);
      if (!source) throw new Error("Allocation not found");
      const copy: Allocation = { ...source, id: generateId() };
      setAllocations((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertAllocation(copy),
            () => setAllocations(snapshot),
          );
        }
        return [...prev, copy];
      });
      return copy;
    },
    [allocations, persistAsync],
  );

  const addTimeEntry = useCallback(
    (values: TimeEntryFormValues): TimeEntry => {
      const entry = buildTimeEntry(values);
      setTimeEntries((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertTimeEntry(entry),
            () => setTimeEntries(snapshot),
          ).then((saved) => {
            if (saved) {
              setTimeEntries((current) =>
                current.map((e) => (e.id === entry.id ? saved : e)),
              );
            }
          });
        }
        return [...prev, entry];
      });
      return entry;
    },
    [persistAsync],
  );

  const updateTimeEntry = useCallback(
    (id: string, values: TimeEntryFormValues) => {
      const updated = buildTimeEntry(values, id);
      setTimeEntries((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertTimeEntry(updated),
            () => setTimeEntries(snapshot),
          );
        }
        return prev.map((e) => (e.id === id ? updated : e));
      });
    },
    [persistAsync],
  );

  const deleteTimeEntry = useCallback(
    (id: string) => {
      setTimeEntries((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteTimeEntry(id),
            () => setTimeEntries(snapshot),
          );
        }
        return prev.filter((e) => e.id !== id);
      });
    },
    [persistAsync],
  );

  const ensureClientInRegistry = useCallback(
    (clientName: string, contact?: ClientContactFields) => {
      const name = clientName.trim();
      const key = normalizeClientName(name);
      if (!key) return;

      setClients((prev) => {
        if (findRegistryClientByName(prev, name)) return prev;

        const client: Client = withClientRegistryContact(
          { id: generateId(), name },
          contact ?? {},
        );
        const snapshot = prev;
        const next = [...prev, client].sort((a, b) => a.name.localeCompare(b.name));

        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertClient(client),
            () => setClients(snapshot),
          ).then((saved) => {
            if (saved) {
              setClients((current) =>
                current.map((c) => (c.id === client.id ? saved : c)),
              );
            }
          });
        }

        return next;
      });
    },
    [persistAsync],
  );

  const addClient = useCallback(
    (values: ClientFormValues): Client | { ok: false; message: string } => {
      const name = values.name.trim();
      const key = normalizeClientName(name);
      if (!key) {
        return { ok: false, message: "Client name is required" };
      }
      if (findRegistryClientByName(clients, name)) {
        return { ok: false, message: "A client with this name already exists" };
      }

      const client: Client = withClientRegistryContact({ id: generateId(), name }, values);
      setClients((prev) => {
        const snapshot = prev;
        const next = [...prev, client].sort((a, b) => a.name.localeCompare(b.name));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertClient(client),
            () => setClients(snapshot),
          ).then((saved) => {
            if (saved) {
              setClients((current) =>
                current.map((c) => (c.id === client.id ? saved : c)),
              );
            }
          });
        }
        return next;
      });
      return client;
    },
    [clients, persistAsync],
  );

  const addProject = useCallback(
    (values: ProjectFormValues): Project => {
      ensureClientInRegistry(values.client_name, {
        address: values.address,
        phone: values.phone,
        email: values.email,
      });

      const project = projectFromFormValues(values, {
        id: generateId(),
        active: true,
      });
      setProjects((prev) => [...prev, project]);

      if (!project.is_change_order) {
        const seeded = seedPhasesForProject(project);
        setProjectPhases((prev) => [...prev, ...seeded]);
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.insertProjectPhases(seeded),
            () =>
              setProjectPhases((prev) =>
                prev.filter((p) => !seeded.some((s) => s.id === p.id)),
              ),
          );
        }
      }

      if (repoRef.current) {
        const snapshot = projects;
        persistAsync(
          () => repoRef.current!.upsertProject(project),
          () => setProjects(snapshot),
        );
      }
      return project;
    },
    [projects, persistAsync, ensureClientInRegistry],
  );

  const replaceProjectPhases = useCallback(
    (projectId: string, phases: ScheduledProjectPhase[]) => {
      setProjectPhases((prev) => {
        const snapshot = prev;
        const next = [...prev.filter((p) => p.project_id !== projectId), ...phases];
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.syncProjectPhases(projectId, phases),
            () => setProjectPhases(snapshot),
          );
        }
        return next;
      });
    },
    [persistAsync],
  );

  const replaceProjectMilestones = useCallback(
    (projectId: string, milestones: ProjectMilestone[]) => {
      setProjectMilestones((prev) => {
        const snapshot = prev;
        const next = [...prev.filter((m) => m.project_id !== projectId), ...milestones];
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.syncProjectMilestones(projectId, milestones),
            () => setProjectMilestones(snapshot),
          );
        }
        return next;
      });
    },
    [persistAsync],
  );

  const seedMissingProjectPhases = useCallback(async () => {
    const missing = projectsNeedingPhaseSeed(projects, projectPhases);
    if (missing.length === 0) return;
    const seeded = missing.flatMap((project) => seedPhasesForProject(project));
    setProjectPhases((prev) => [...prev, ...seeded]);
    if (repoRef.current) {
      await persistAsync(
        () => repoRef.current!.insertProjectPhases(seeded),
        () =>
          setProjectPhases((prev) =>
            prev.filter((p) => !seeded.some((s) => s.id === p.id)),
          ),
      );
    }
  }, [projects, projectPhases, persistAsync]);

  const updateProject = useCallback(
    (id: string, values: ProjectFormValues) => {
      setProjects((prev) => {
        const snapshot = prev;
        const existing = prev.find((p) => p.id === id);
        if (!existing) return prev;
        const merged = projectFromFormValues(values, existing);
        const next = prev.map((p) => (p.id === id ? merged : p));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.updateProject(merged),
            () => setProjects(snapshot),
          ).then((saved) => {
            if (saved) {
              setProjects((current) =>
                current.map((p) => (p.id === id ? saved : p)),
              );
            }
          });
        }
        return next;
      });
    },
    [persistAsync],
  );

  const updateClientContact = useCallback(
    (clientKey: string, contact: ClientContactFields) => {
      const key = normalizeClientName(clientKey);
      if (!key) return;

      const matchingProjects = projectsForClientKey(projects, key);
      const displayName = matchingProjects[0]?.client_name?.trim();
      if (displayName && !findRegistryClientByName(clients, displayName)) {
        ensureClientInRegistry(displayName, contact);
      } else {
        setClients((prev) => {
          const snapshot = prev;
          const registryMatch =
            findRegistryClientByName(prev, displayName ?? clientKey) ??
            prev.find((c) => normalizeClientName(c.name) === key);
          if (!registryMatch) return prev;

          const updatedClient = withClientRegistryContact(registryMatch, contact);
          const next = prev.map((c) => (c.id === registryMatch.id ? updatedClient : c));

          if (repoRef.current) {
            void persistAsync(
              () => repoRef.current!.updateClient(updatedClient),
              () => setClients(snapshot),
            ).then((saved) => {
              if (saved) {
                setClients((current) =>
                  current.map((c) => (c.id === registryMatch.id ? saved : c)),
                );
              }
            });
          }

          return next;
        });
      }

      setProjects((prev) => {
        const snapshot = prev;
        const matching = projectsForClientKey(prev, key);
        if (matching.length === 0) return prev;

        const matchingIds = new Set(matching.map((p) => p.id));
        const next = prev.map((p) =>
          matchingIds.has(p.id) ? withClientContact(p, contact) : p,
        );

        if (repoRef.current) {
          const updated = next.filter((p) => matchingIds.has(p.id));
          void persistAsync(
            async () => {
              await Promise.all(updated.map((p) => repoRef.current!.updateProject(p)));
            },
            () => setProjects(snapshot),
          );
        }

        return next;
      });
    },
    [projects, clients, persistAsync, ensureClientInRegistry],
  );

  const addProjectNote = useCallback(
    (projectId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      const note: ProjectNote = {
        id: generateId(),
        project_id: projectId,
        body: trimmed,
        created_at: now,
        updated_at: now,
      };
      setProjectNotes((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.insertProjectNote(note),
            () => setProjectNotes(snapshot),
          ).then((saved) => {
            if (saved) {
              setProjectNotes((current) =>
                current.map((n) => (n.id === note.id ? saved : n)),
              );
            }
          });
        }
        return [note, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });
    },
    [persistAsync],
  );

  const updateProjectNote = useCallback(
    (id: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      setProjectNotes((prev) => {
        const snapshot = prev;
        const existing = prev.find((n) => n.id === id);
        if (!existing) return prev;
        const updated: ProjectNote = {
          ...existing,
          body: trimmed,
          updated_at: now,
        };
        const next = prev.map((n) => (n.id === id ? updated : n));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.updateProjectNote(updated),
            () => setProjectNotes(snapshot),
          ).then((saved) => {
            if (saved) {
              setProjectNotes((current) =>
                current.map((n) => (n.id === id ? saved : n)),
              );
            }
          });
        }
        return next;
      });
    },
    [persistAsync],
  );

  const deleteProjectNote = useCallback(
    (id: string) => {
      setProjectNotes((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteProjectNote(id),
            () => setProjectNotes(snapshot),
          );
        }
        return prev.filter((n) => n.id !== id);
      });
    },
    [persistAsync],
  );

  const addClientNote = useCallback(
    (clientKey: string, body: string) => {
      const trimmed = body.trim();
      const key = clientKey.trim().toLowerCase();
      if (!trimmed || !key) return;
      const now = new Date().toISOString();
      const note: ClientNote = {
        id: generateId(),
        client_key: key,
        body: trimmed,
        created_at: now,
        updated_at: now,
      };
      setClientNotes((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.insertClientNote(note),
            () => setClientNotes(snapshot),
          ).then((saved) => {
            if (saved) {
              setClientNotes((current) =>
                current.map((n) => (n.id === note.id ? saved : n)),
              );
            }
          });
        }
        return [note, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });
    },
    [persistAsync],
  );

  const updateClientNote = useCallback(
    (id: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      setClientNotes((prev) => {
        const snapshot = prev;
        const existing = prev.find((n) => n.id === id);
        if (!existing) return prev;
        const updated: ClientNote = {
          ...existing,
          body: trimmed,
          updated_at: now,
        };
        const next = prev.map((n) => (n.id === id ? updated : n));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.updateClientNote(updated),
            () => setClientNotes(snapshot),
          ).then((saved) => {
            if (saved) {
              setClientNotes((current) =>
                current.map((n) => (n.id === id ? saved : n)),
              );
            }
          });
        }
        return next;
      });
    },
    [persistAsync],
  );

  const deleteClientNote = useCallback(
    (id: string) => {
      setClientNotes((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteClientNote(id),
            () => setClientNotes(snapshot),
          );
        }
        return prev.filter((n) => n.id !== id);
      });
    },
    [persistAsync],
  );

  const updateSettings = useCallback(
    (partial: Partial<CompanySettings>) => {
      const snapshot = settings;
      const next = normalizeCompanySettings({ ...settings, ...partial });
      setSettings(next);
      if (repoRef.current) {
        persistAsync(
          () => repoRef.current!.updateSettings(next),
          () => setSettings(snapshot),
        );
      }
    },
    [settings, persistAsync],
  );

  const ensureTeamMemberOptions = useCallback(
    (values: EmployeeFormValues) => {
      const roleNext = appendJobRole(settings, values.role);
      const deptNext = values.department?.trim()
        ? appendDepartment(settings, values.department)
        : null;
      if (roleNext || deptNext) {
        updateSettings({
          ...(roleNext ? { job_roles: roleNext } : {}),
          ...(deptNext ? { departments: deptNext } : {}),
        });
      }
    },
    [settings, updateSettings],
  );

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Employee>) => {
      setEmployees((prev) => {
        const snapshot = prev;
        const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
        const merged = next.find((e) => e.id === id);
        if (merged && repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEmployee(merged),
            () => setEmployees(snapshot),
          ).then((saved) => {
            if (saved) {
              setEmployees((current) => current.map((e) => (e.id === id ? saved : e)));
            }
          });
        }
        return next;
      });
    },
    [persistAsync],
  );

  const employeeFromForm = useCallback(
    (id: string, values: EmployeeFormValues): Employee => ({
      id,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      role: values.role,
      email: values.email?.trim() || undefined,
      department: values.department?.trim() || undefined,
      daily_capacity_hours: values.daily_capacity_hours,
      weekly_capacity_hours: values.weekly_capacity_hours,
      active: values.active,
    }),
    [],
  );

  const addEmployee = useCallback(
    (values: EmployeeFormValues): Employee => {
      const employee = employeeFromForm(generateId(), values);
      setEmployees((prev) => {
        const snapshot = prev;
        const next = [...prev, employee];
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEmployee(employee),
            () => setEmployees(snapshot),
          ).then((saved) => {
            if (saved) {
              setEmployees((current) =>
                current.map((e) => (e.id === employee.id ? saved : e)),
              );
            }
          });
        }
        return next;
      });
      ensureTeamMemberOptions(values);
      return employee;
    },
    [employeeFromForm, persistAsync, ensureTeamMemberOptions],
  );

  const updateEmployeeFromForm = useCallback(
    (id: string, values: EmployeeFormValues) => {
      const employee = employeeFromForm(id, values);
      ensureTeamMemberOptions(values);
      setEmployees((prev) => {
        const snapshot = prev;
        const next = prev.map((e) => (e.id === id ? employee : e));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEmployee(employee),
            () => setEmployees(snapshot),
          ).then((saved) => {
            if (saved) {
              setEmployees((current) => current.map((e) => (e.id === id ? saved : e)));
            }
          });
        }
        return next;
      });
    },
    [employeeFromForm, persistAsync, ensureTeamMemberOptions],
  );

  const deleteEmployee = useCallback(
    (id: string): { ok: true } | { ok: false; message: string } => {
      const employee = employees.find((e) => e.id === id);
      if (!employee) {
        return { ok: false, message: "Team member not found." };
      }

      const employeesSnapshot = employees;
      const allocationsSnapshot = allocations;
      const timeEntriesSnapshot = timeEntries;
      const projectsSnapshot = projects;

      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setAllocations((prev) => prev.filter((a) => a.employee_id !== id));
      setTimeEntries((prev) => prev.filter((e) => e.employee_id !== id));
      setProjects((prev) =>
        prev.map((p) => {
          let next = p;
          if (p.lead_employee_id === id) {
            next = { ...next, lead_employee_id: undefined };
          }
          if (p.lead_estimator_id === id) {
            next = { ...next, lead_estimator_id: undefined };
          }
          return next;
        }),
      );

      if (repoRef.current) {
        void persistAsync(
          () => repoRef.current!.deleteEmployee(id),
          () => {
            setEmployees(employeesSnapshot);
            setAllocations(allocationsSnapshot);
            setTimeEntries(timeEntriesSnapshot);
            setProjects(projectsSnapshot);
          },
        );
      }

      return { ok: true };
    },
    [employees, allocations, timeEntries, projects, persistAsync],
  );

  const addCategory = useCallback(
    (values: CategoryFormValues): AllocationCategory | null => {
      const name = values.name.trim();
      if (!name) return null;

      const duplicate = categories.some(
        (c) => c.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0,
      );
      if (duplicate) return null;

      const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
      const category: AllocationCategory = {
        id: generateId(),
        name,
        color: values.color,
        is_billable_default: values.is_billable_default,
        sort_order: maxSort + 1,
      };

      setCategories((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertCategory(category),
            () => setCategories(snapshot),
          ).then((saved) => {
            if (saved) {
              setCategories((current) =>
                current.map((c) => (c.id === category.id ? saved : c)),
              );
            }
          });
        }
        return [...prev, category];
      });
      return category;
    },
    [categories, persistAsync],
  );

  const deleteCategory = useCallback(
    (id: string): { ok: true } | { ok: false; message: string } => {
      if (categories.length <= 1) {
        return { ok: false, message: "At least one category is required." };
      }

      const inUse =
        allocations.some((a) => a.allocation_category_id === id) ||
        timeEntries.some((e) => e.allocation_category_id === id);
      if (inUse) {
        return {
          ok: false,
          message:
            "This category is used on schedule or time entries. Reassign those rows before deleting.",
        };
      }

      setCategories((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteCategory(id),
            () => setCategories(snapshot),
          );
        }
        return prev.filter((c) => c.id !== id);
      });

      setFiltersState((prev) =>
        prev.categoryId === id ? { ...prev, categoryId: null } : prev,
      );

      return { ok: true };
    },
    [categories.length, allocations, timeEntries, persistAsync],
  );

  const value = useMemo(
    () => ({
      dataSource,
      isLoading,
      queueRevision,
      error,
      employees,
      projects,
      clients,
      projectNotes,
      clientNotes,
      categories,
      allocations,
      timeEntries,
      projectPhases,
      projectMilestones,
      settings,
      selectedWeekStart,
      filters,
      setWeek,
      setMonth,
      goToPreviousWeek,
      goToNextWeek,
      goToPreviousMonth,
      goToNextMonth,
      goToToday,
      setFilters,
      clearFilters,
      addAllocation,
      updateAllocation,
      moveAllocation,
      deleteAllocation,
      duplicateAllocation,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      addProject,
      updateProject,
      addClient,
      updateClientContact,
      addProjectNote,
      updateProjectNote,
      deleteProjectNote,
      addClientNote,
      updateClientNote,
      deleteClientNote,
      updateSettings,
      updateEmployee,
      addEmployee,
      updateEmployeeFromForm,
      deleteEmployee,
      addCategory,
      deleteCategory,
      getCategoryById,
      getProjectById,
      getEmployeeById,
      replaceProjectPhases,
      replaceProjectMilestones,
      seedMissingProjectPhases,
      refreshData,
    }),
    [
      dataSource,
      isLoading,
      queueRevision,
      error,
      employees,
      projects,
      clients,
      projectNotes,
      clientNotes,
      categories,
      allocations,
      timeEntries,
      projectPhases,
      projectMilestones,
      settings,
      selectedWeekStart,
      filters,
      setWeek,
      setMonth,
      goToPreviousWeek,
      goToNextWeek,
      goToPreviousMonth,
      goToNextMonth,
      goToToday,
      setFilters,
      clearFilters,
      addAllocation,
      updateAllocation,
      moveAllocation,
      deleteAllocation,
      duplicateAllocation,
      addTimeEntry,
      updateTimeEntry,
      deleteTimeEntry,
      addProject,
      updateProject,
      addClient,
      updateClientContact,
      addProjectNote,
      updateProjectNote,
      deleteProjectNote,
      addClientNote,
      updateClientNote,
      deleteClientNote,
      updateSettings,
      updateEmployee,
      addEmployee,
      updateEmployeeFromForm,
      deleteEmployee,
      addCategory,
      deleteCategory,
      getCategoryById,
      getProjectById,
      getEmployeeById,
      replaceProjectPhases,
      replaceProjectMilestones,
      seedMissingProjectPhases,
      refreshData,
    ],
  );

  return <SchedulingContext.Provider value={value}>{children}</SchedulingContext.Provider>;
}

export function useScheduling() {
  const ctx = useContext(SchedulingContext);
  if (!ctx) throw new Error("useScheduling must be used within SchedulingProvider");
  return ctx;
}
