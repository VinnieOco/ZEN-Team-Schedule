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
import { addMonths, addWeeks, format, subMonths, subWeeks } from "date-fns";

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
  clientRouteKey,
  findRegistryClientByName,
  hydrateClientsFromProjects,
  mergeClientRegistry,
  moveProjectsToClientName,
  normalizeClientName,
  projectsForClientKey,
  renameClientRegistry,
  rekeyClientNotes,
  validateClientMerge,
  validateClientRename,
  withClientContact,
  withClientRegistryContact,
  type ClientContactFields,
  type ClientNameActionResult,
} from "@/lib/clients";
import { projectFromFormValues } from "@/lib/project-form";
import { milestonesForProject } from "@/lib/gantt/milestones";
import { projectsNeedingPhaseSeed, seedPhasesForProject } from "@/lib/gantt/seed-phases";
import { normalizeHandle, suggestEmployeeHandle } from "@/lib/todos/handles";
import { resolveMentionedEmployees } from "@/lib/todos/mentions";
import {
  isSameMentionTodo,
  mentionTodoKey,
  removeMentionTodosForNote,
  syncMentionTodos,
} from "@/lib/todos/sync-mention-todos";
import { getMonthStart, getWeekStart } from "@/lib/week";
import { useAuth } from "@/context/auth-context";
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
  Todo,
  TodoNoteSourceType,
  Lead,
  LeadNote,
  LeadFormValues,
  Estimate,
  EstimateFormValues,
  EstimateResult,
  EstimateStage,
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
  todos?: Todo[];
  leads?: Lead[];
  leadNotes?: LeadNote[];
  estimates?: Estimate[];
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
  todos: Todo[];
  leads: Lead[];
  leadNotes: LeadNote[];
  estimates: Estimate[];
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
  updateClientContact: (
    clientKey: string,
    contact: ClientContactFields,
    preferredDisplayName?: string,
  ) => void;
  renameClient: (sourceKey: string, newName: string) => ClientNameActionResult;
  mergeClients: (sourceKey: string, targetKey: string) => ClientNameActionResult;
  addProjectNote: (projectId: string, body: string) => void;
  updateProjectNote: (id: string, body: string) => void;
  deleteProjectNote: (id: string) => void;
  addClientNote: (clientKey: string, body: string) => void;
  updateClientNote: (id: string, body: string) => void;
  deleteClientNote: (id: string) => void;
  addTodo: (employeeId: string, body: string) => void;
  setTodoCompleted: (id: string, completed: boolean) => void;
  deleteTodo: (id: string) => void;
  addLead: (values: LeadFormValues) => Lead;
  updateLead: (id: string, values: LeadFormValues) => void;
  deleteLead: (id: string) => void;
  addLeadNote: (leadId: string, body: string) => void;
  deleteLeadNote: (id: string) => void;
  convertLeadToProject: (id: string) => Project | null;
  addEstimate: (values: EstimateFormValues) => Estimate;
  updateEstimate: (id: string, values: EstimateFormValues) => void;
  deleteEstimate: (id: string) => void;
  setEstimateStage: (id: string, stage: EstimateStage) => void;
  markEstimateSubmitted: (id: string, submittedDate?: string) => void;
  setEstimateResult: (id: string, result: EstimateResult) => void;
  /** Clones an estimate as the next revision, back in pricing with result cleared. */
  reviseEstimate: (id: string) => Estimate | null;
  setEstimateChecklistItem: (id: string, itemId: string, done: boolean) => void;
  addEstimateChecklistItem: (id: string, label: string) => void;
  removeEstimateChecklistItem: (id: string, itemId: string) => void;
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
  toggleProjectMilestoneCompleted: (milestoneId: string, completed: boolean) => void;
  updateProjectMilestoneAssigned: (
    milestoneId: string,
    assignedEmployeeId: string | undefined,
  ) => void;
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

/** Won/lost stages carry the result; any other stage means the package is still open. */
function estimateResultForStage(stage: EstimateStage): EstimateResult {
  if (stage === "won") return "won";
  if (stage === "lost") return "lost";
  return "pending";
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
    timesheet_line_id: values.timesheet_line_id,
  };
}

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const useSupabase = isSupabaseConfigured();
  const { profile } = useAuth();
  const repoRef = useRef<SchedulingRepository | null>(null);
  const milestoneSyncSeqRef = useRef(new Map<string, number>());

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
  const [todos, setTodos] = useState<Todo[]>(useSupabase ? [] : (persisted?.todos ?? []));
  const [leads, setLeads] = useState<Lead[]>(useSupabase ? [] : (persisted?.leads ?? []));
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>(() => {
    if (useSupabase) return [];
    if (persisted?.leadNotes) return persisted.leadNotes;
    return (persisted?.leads ?? []).flatMap((lead) => {
      const body = lead.notes?.trim();
      if (!body) return [];
      return [
        {
          id: generateId(),
          lead_id: lead.id,
          body,
          created_at: lead.updated_at,
          updated_at: lead.updated_at,
        },
      ];
    });
  });
  const [estimates, setEstimates] = useState<Estimate[]>(
    useSupabase ? [] : (persisted?.estimates ?? []),
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
    showWeekend: false,
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
        const todosData = await repo.listTodos();
        setTodos(todosData);
      } catch {
        setTodos([]);
      }

      try {
        const leadsData = await repo.listLeads();
        setLeads(leadsData);
      } catch {
        // Table may be missing until migration 20260724160000_leads.sql is applied.
        setLeads([]);
      }

      try {
        const leadNotesData = await repo.listLeadNotes();
        setLeadNotes(leadNotesData);
      } catch {
        // Table may be missing until the lead notes migration is applied.
        setLeadNotes([]);
      }

      try {
        const estimatesData = await repo.listEstimates();
        setEstimates(estimatesData);
      } catch {
        // Table may be missing until migration 20260724170000_estimates.sql is applied.
        setEstimates([]);
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
      todos,
      leads,
      leadNotes,
      estimates,
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
    todos,
    leads,
    leadNotes,
    estimates,
    settings,
  ]);

  const persistAsync = useCallback(
    async <T,>(action: () => Promise<T>, rollback: () => void): Promise<T | undefined> => {
      if (!repoRef.current) return undefined;
      try {
        const result = await action();
        setError(null);
        return result;
      } catch (err) {
        rollback();
        setError(getPersistErrorMessage(err));
        return undefined;
      }
    },
    [],
  );

  const persistTodoDiff = useCallback(
    (previousTodos: Todo[], nextTodos: Todo[]) => {
      const nextIds = new Set(nextTodos.map((todo) => todo.id));
      const removed = previousTodos.filter((todo) => !nextIds.has(todo.id));
      const upserted = nextTodos.filter((todo) => {
        const previous = previousTodos.find((item) => item.id === todo.id);
        return (
          !previous ||
          previous.body !== todo.body ||
          previous.status !== todo.status ||
          previous.completed_at !== todo.completed_at ||
          previous.updated_at !== todo.updated_at
        );
      });

      if (!repoRef.current) return;

      const snapshot = previousTodos;
      for (const todo of removed) {
        void persistAsync(
          () => repoRef.current!.deleteTodo(todo.id),
          () => setTodos(snapshot),
        );
      }
      for (const todo of upserted) {
        void persistAsync(
          () => repoRef.current!.upsertTodo(todo),
          () => setTodos(snapshot),
        ).then((saved) => {
          if (saved) {
            setTodos((current) => {
              const merged = current.map((item) =>
                item.id === todo.id || isSameMentionTodo(item, saved) ? saved : item,
              );
              const seen = new Set<string>();
              return merged.filter((item) => {
                const key = mentionTodoKey(item) ?? item.id;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            });
          }
        });
      }
    },
    [persistAsync],
  );

  const applyMentionTodoSync = useCallback(
    (
      noteId: string,
      noteType: TodoNoteSourceType,
      body: string,
      context: { projectId?: string; clientKey?: string },
    ) => {
      const mentionedEmployees = resolveMentionedEmployees(body, employees);
      setTodos((previousTodos) => {
        const nextTodos = syncMentionTodos(previousTodos, {
          noteId,
          noteType,
          body,
          mentionedEmployees,
          projectId: context.projectId,
          clientKey: context.clientKey,
          createdBy: profile?.id ?? null,
        });
        persistTodoDiff(previousTodos, nextTodos);
        return nextTodos;
      });
    },
    [employees, persistTodoDiff, profile?.id],
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
    showWeekend: false,
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
      const seq = (milestoneSyncSeqRef.current.get(projectId) ?? 0) + 1;
      milestoneSyncSeqRef.current.set(projectId, seq);

      setProjectMilestones((prev) => {
        const snapshot = prev;
        const next = [...prev.filter((m) => m.project_id !== projectId), ...milestones];
        if (repoRef.current) {
          void persistAsync(
            async () => {
              if (milestoneSyncSeqRef.current.get(projectId) !== seq) return;
              await repoRef.current!.syncProjectMilestones(projectId, milestones);
            },
            () => {
              if (milestoneSyncSeqRef.current.get(projectId) !== seq) return;
              setProjectMilestones(snapshot);
            },
          );
        }
        return next;
      });
    },
    [persistAsync],
  );

  const toggleProjectMilestoneCompleted = useCallback(
    (milestoneId: string, completed: boolean) => {
      const target = projectMilestones.find((m) => m.id === milestoneId);
      if (!target) return;
      const completedAt = completed ? new Date().toISOString() : undefined;
      const updatedForProject = milestonesForProject(projectMilestones, target.project_id).map(
        (m) => (m.id === milestoneId ? { ...m, completed_at: completedAt } : m),
      );
      replaceProjectMilestones(target.project_id, updatedForProject);
    },
    [projectMilestones, replaceProjectMilestones],
  );

  const updateProjectMilestoneAssigned = useCallback(
    (milestoneId: string, assignedEmployeeId: string | undefined) => {
      const target = projectMilestones.find((m) => m.id === milestoneId);
      if (!target) return;
      const updatedForProject = milestonesForProject(projectMilestones, target.project_id).map(
        (m) =>
          m.id === milestoneId ? { ...m, assigned_employee_id: assignedEmployeeId } : m,
      );
      replaceProjectMilestones(target.project_id, updatedForProject);
    },
    [projectMilestones, replaceProjectMilestones],
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
    (clientKey: string, contact: ClientContactFields, preferredDisplayName?: string) => {
      const key = normalizeClientName(clientKey);
      if (!key) return;

      const matchingProjects = projectsForClientKey(projects, key);
      const displayName =
        matchingProjects[0]?.client_name?.trim() ||
        preferredDisplayName?.trim() ||
        findRegistryClientByName(clients, clientKey)?.name?.trim();

      if (displayName && !findRegistryClientByName(clients, displayName)) {
        ensureClientInRegistry(displayName, contact);
      } else {
        setClients((prev) => {
          const snapshot = prev;
          const registryMatch =
            findRegistryClientByName(prev, displayName ?? clientKey) ??
            prev.find((c) => normalizeClientName(c.name) === key);
          if (!registryMatch) {
            // Lead-only client with a display name: create registry row on first save.
            if (!displayName) return prev;
            const created = withClientRegistryContact(
              { id: generateId(), name: displayName },
              contact,
            );
            if (repoRef.current) {
              void persistAsync(
                () => repoRef.current!.upsertClient(created),
                () => setClients(snapshot),
              );
            }
            return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
          }

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

  const renameClient = useCallback(
    (sourceKey: string, newName: string): ClientNameActionResult => {
      const validation = validateClientRename(sourceKey, newName, projects, clients);
      if (!validation.ok) return validation;

      const { sourceKey: source, newKey, newName: trimmedName } = validation;
      const projectsSnapshot = projects;
      const clientsSnapshot = clients;
      const notesSnapshot = clientNotes;

      const matchingIds = new Set(
        projectsForClientKey(projects, source).map((project) => project.id),
      );
      const updatedProjects = projects.map((project) =>
        matchingIds.has(project.id) ? { ...project, client_name: trimmedName } : project,
      );
      const updatedNotes = rekeyClientNotes(clientNotes, source, newKey);
      const { clients: updatedClients, upsertClients } = renameClientRegistry(
        clients,
        source,
        trimmedName,
      );

      setProjects(updatedProjects);
      setClientNotes(updatedNotes);
      setClients(updatedClients);

      if (repoRef.current) {
        void persistAsync(
          async () => {
            const repo = repoRef.current!;
            const changedProjects = updatedProjects.filter((project) =>
              matchingIds.has(project.id),
            );
            await Promise.all(changedProjects.map((project) => repo.updateProject(project)));
            await Promise.all(upsertClients.map((client) => repo.updateClient(client)));
            if (source !== newKey) {
              await repo.rekeyClientNotes(source, newKey);
            }
          },
          () => {
            setProjects(projectsSnapshot);
            setClients(clientsSnapshot);
            setClientNotes(notesSnapshot);
          },
        );
      }

      return {
        ok: true,
        routeKey: clientRouteKey(trimmedName),
        displayName: trimmedName,
      };
    },
    [projects, clients, clientNotes, persistAsync],
  );

  const mergeClients = useCallback(
    (sourceKey: string, targetKey: string): ClientNameActionResult => {
      const validation = validateClientMerge(sourceKey, targetKey, projects, clients);
      if (!validation.ok) return validation;

      const { sourceKey: source, targetKey: target, targetDisplayName } = validation;
      const projectsSnapshot = projects;
      const clientsSnapshot = clients;
      const notesSnapshot = clientNotes;

      const sourceProjectIds = new Set(
        projectsForClientKey(projects, source).map((project) => project.id),
      );
      const updatedProjects = moveProjectsToClientName(projects, source, targetDisplayName);
      const updatedNotes = rekeyClientNotes(clientNotes, source, target);
      const {
        clients: updatedClients,
        deleteClientIds,
        upsertClients,
      } = mergeClientRegistry(clients, source, target, targetDisplayName);

      setProjects(updatedProjects);
      setClientNotes(updatedNotes);
      setClients(updatedClients);

      if (repoRef.current) {
        void persistAsync(
          async () => {
            const repo = repoRef.current!;
            const changedProjects = updatedProjects.filter((project) =>
              sourceProjectIds.has(project.id),
            );
            await Promise.all(changedProjects.map((project) => repo.updateProject(project)));
            await Promise.all(upsertClients.map((client) => repo.updateClient(client)));
            await Promise.all(deleteClientIds.map((id) => repo.deleteClient(id)));
            await repo.rekeyClientNotes(source, target);
          },
          () => {
            setProjects(projectsSnapshot);
            setClients(clientsSnapshot);
            setClientNotes(notesSnapshot);
          },
        );
      }

      return {
        ok: true,
        routeKey: clientRouteKey(targetDisplayName),
        displayName: targetDisplayName,
      };
    },
    [projects, clients, clientNotes, persistAsync],
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
        created_by: profile?.id ?? null,
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
      applyMentionTodoSync(note.id, "project", trimmed, { projectId });
    },
    [applyMentionTodoSync, persistAsync, profile?.id],
  );

  const updateProjectNote = useCallback(
    (id: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      const existing = projectNotes.find((note) => note.id === id);
      if (!existing) return;
      setProjectNotes((prev) => {
        const snapshot = prev;
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
      applyMentionTodoSync(id, "project", trimmed, { projectId: existing.project_id });
    },
    [applyMentionTodoSync, persistAsync, projectNotes],
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
      setTodos((previousTodos) => {
        const nextTodos = removeMentionTodosForNote(previousTodos, id, "project");
        persistTodoDiff(previousTodos, nextTodos);
        return nextTodos;
      });
    },
    [persistAsync, persistTodoDiff],
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
        created_by: profile?.id ?? null,
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
      applyMentionTodoSync(note.id, "client", trimmed, { clientKey: key });
    },
    [applyMentionTodoSync, persistAsync, profile?.id],
  );

  const updateClientNote = useCallback(
    (id: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      const existing = clientNotes.find((note) => note.id === id);
      if (!existing) return;
      setClientNotes((prev) => {
        const snapshot = prev;
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
      applyMentionTodoSync(id, "client", trimmed, { clientKey: existing.client_key });
    },
    [applyMentionTodoSync, clientNotes, persistAsync],
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
      setTodos((previousTodos) => {
        const nextTodos = removeMentionTodosForNote(previousTodos, id, "client");
        persistTodoDiff(previousTodos, nextTodos);
        return nextTodos;
      });
    },
    [persistAsync, persistTodoDiff],
  );

  const addTodo = useCallback(
    (employeeId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      const primaryTodo: Todo = {
        id: generateId(),
        employee_id: employeeId,
        body: trimmed,
        status: "open",
        completed_at: null,
        created_by: profile?.id ?? null,
        source_type: "manual",
        source_project_id: null,
        source_client_key: null,
        source_note_id: null,
        source_note_type: null,
        created_at: now,
        updated_at: now,
      };
      const mentionTodos = resolveMentionedEmployees(trimmed, employees)
        .filter((employee) => employee.id !== employeeId)
        .map((employee) => ({
          ...primaryTodo,
          id: generateId(),
          employee_id: employee.id,
        }));

      const createdTodos = [primaryTodo, ...mentionTodos];
      setTodos((previousTodos) => {
        const snapshot = previousTodos;
        const nextTodos = [...createdTodos, ...previousTodos];
        if (repoRef.current) {
          for (const todo of createdTodos) {
            void persistAsync(
              () => repoRef.current!.upsertTodo(todo),
              () => setTodos(snapshot),
            );
          }
        }
        return nextTodos;
      });
    },
    [employees, persistAsync, profile?.id],
  );

  const setTodoCompleted = useCallback(
    (id: string, completed: boolean) => {
      const now = new Date().toISOString();
      setTodos((previousTodos) => {
        const snapshot = previousTodos;
        const nextTodos = previousTodos.map((todo) => {
          if (todo.id !== id) return todo;
          return {
            ...todo,
            status: (completed ? "completed" : "open") as Todo["status"],
            completed_at: completed ? now : null,
            updated_at: now,
          };
        });
        if (repoRef.current) {
          const updated = nextTodos.find((todo) => todo.id === id);
          if (updated) {
            void persistAsync(
              () => repoRef.current!.upsertTodo(updated),
              () => setTodos(snapshot),
            );
          }
        }
        return nextTodos;
      });
    },
    [persistAsync],
  );

  const deleteTodo = useCallback(
    (id: string) => {
      setTodos((previousTodos) => {
        const snapshot = previousTodos;
        const nextTodos = previousTodos.filter((todo) => todo.id !== id);
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteTodo(id),
            () => setTodos(snapshot),
          );
        }
        return nextTodos;
      });
    },
    [persistAsync],
  );

  const leadFromFormValues = useCallback(
    (values: LeadFormValues, existing?: Lead): Lead => {
      const now = new Date().toISOString();
      return {
        id: existing?.id ?? generateId(),
        title: values.title?.trim() || undefined,
        client_name: values.client_name.trim(),
        contact_name: values.contact_name?.trim() || undefined,
        contact_phone: values.contact_phone?.trim() || undefined,
        contact_email: values.contact_email?.trim() || undefined,
        source: values.source,
        status: values.status,
        expected_value: values.expected_value,
        probability: values.probability,
        next_follow_up_date: values.next_follow_up_date || undefined,
        owner_employee_id: values.owner_employee_id || undefined,
        notes: values.notes?.trim() || undefined,
        converted_project_id: existing?.converted_project_id,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
    },
    [],
  );

  const addLead = useCallback(
    (values: LeadFormValues): Lead => {
      const lead = leadFromFormValues(values);
      setLeads((prev) => {
        const snapshot = prev;
        const next = [lead, ...prev];
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertLead(lead),
            () => setLeads(snapshot),
          );
        }
        return next;
      });
      return lead;
    },
    [leadFromFormValues, persistAsync],
  );

  const updateLead = useCallback(
    (id: string, values: LeadFormValues) => {
      setLeads((prev) => {
        const existing = prev.find((l) => l.id === id);
        if (!existing) return prev;
        const snapshot = prev;
        const updated = leadFromFormValues(values, existing);
        const next = prev.map((l) => (l.id === id ? updated : l));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertLead(updated),
            () => setLeads(snapshot),
          );
        }
        return next;
      });
    },
    [leadFromFormValues, persistAsync],
  );

  const deleteLead = useCallback(
    (id: string) => {
      setLeads((prev) => {
        const snapshot = prev;
        const next = prev.filter((l) => l.id !== id);
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteLead(id),
            () => setLeads(snapshot),
          );
        }
        return next;
      });
      setLeadNotes((prev) => prev.filter((note) => note.lead_id !== id));
    },
    [persistAsync],
  );

  const addLeadNote = useCallback(
    (leadId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const now = new Date().toISOString();
      const note: LeadNote = {
        id: generateId(),
        lead_id: leadId,
        body: trimmed,
        created_by: profile?.id,
        created_at: now,
        updated_at: now,
      };
      setLeadNotes((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.insertLeadNote(note),
            () => setLeadNotes(snapshot),
          ).then((saved) => {
            if (saved) {
              setLeadNotes((current) =>
                current.map((entry) => (entry.id === note.id ? saved : entry)),
              );
            }
          });
        }
        return [note, ...prev];
      });
    },
    [persistAsync, profile?.id],
  );

  const deleteLeadNote = useCallback(
    (id: string) => {
      setLeadNotes((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteLeadNote(id),
            () => setLeadNotes(snapshot),
          );
        }
        return prev.filter((note) => note.id !== id);
      });
    },
    [persistAsync],
  );

  const convertLeadToProject = useCallback(
    (id: string): Project | null => {
      const lead = leads.find((l) => l.id === id);
      if (!lead || lead.converted_project_id) return null;

      const projectName = lead.title?.trim() || lead.client_name.trim();
      const project = addProject({
        project_name: projectName,
        client_name: lead.client_name,
        department: "Design",
        phase: "Concept",
        lead_employee_id: lead.owner_employee_id,
        budgeted_design_hours: 0,
        design_amount: lead.expected_value,
        phone: lead.contact_phone,
        email: lead.contact_email,
        active: true,
      });

      // Carry lead notes into project team notes so history stays with the job.
      const sourceNotes = leadNotes
        .filter((note) => note.lead_id === id)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      const notesToTransfer: Array<{
        body: string;
        created_by?: string | null;
        created_at: string;
        updated_at: string;
      }> =
        sourceNotes.length > 0
          ? sourceNotes
          : lead.notes?.trim()
            ? [
                {
                  body: lead.notes.trim(),
                  created_by: profile?.id ?? null,
                  created_at: lead.updated_at,
                  updated_at: lead.updated_at,
                },
              ]
            : [];
      if (notesToTransfer.length > 0) {
        const transferred: ProjectNote[] = notesToTransfer.map((note) => ({
          id: generateId(),
          project_id: project.id,
          body: note.body,
          created_by: note.created_by ?? profile?.id ?? null,
          created_at: note.created_at,
          updated_at: note.updated_at,
        }));
        setProjectNotes((prev) => {
          const snapshot = prev;
          if (repoRef.current) {
            for (const note of transferred) {
              void persistAsync(
                () => repoRef.current!.insertProjectNote(note),
                () => setProjectNotes(snapshot),
              ).then((saved) => {
                if (saved) {
                  setProjectNotes((current) =>
                    current.map((entry) => (entry.id === note.id ? saved : entry)),
                  );
                }
              });
            }
          }
          return [...transferred, ...prev].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
        });
        for (const note of transferred) {
          applyMentionTodoSync(note.id, "project", note.body, {
            projectId: project.id,
          });
        }
      }

      const now = new Date().toISOString();
      setLeads((prev) => {
        const snapshot = prev;
        const next = prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: "won" as const,
                converted_project_id: project.id,
                updated_at: now,
              }
            : l,
        );
        const updated = next.find((l) => l.id === id);
        if (repoRef.current && updated) {
          void persistAsync(
            () => repoRef.current!.upsertLead(updated),
            () => setLeads(snapshot),
          );
        }
        return next;
      });

      return project;
    },
    [
      leads,
      leadNotes,
      addProject,
      persistAsync,
      profile?.id,
      applyMentionTodoSync,
    ],
  );

  const estimateFromFormValues = useCallback(
    (values: EstimateFormValues, existing?: Estimate): Estimate => {
      const now = new Date().toISOString();
      return {
        id: existing?.id ?? generateId(),
        client_name: values.client_name.trim(),
        project_id: values.project_id || undefined,
        title: values.title?.trim() || undefined,
        estimate_type: values.estimate_type,
        revision_number: existing?.revision_number ?? 0,
        revises_estimate_id: existing?.revises_estimate_id,
        estimator_id: values.estimator_id || undefined,
        received_date: values.received_date || undefined,
        due_date: values.due_date || undefined,
        submitted_date: values.submitted_date || undefined,
        amount: values.amount,
        stage: values.stage,
        result: estimateResultForStage(values.stage),
        checklist: existing?.checklist ?? [],
        notes: values.notes?.trim() || undefined,
        sort_order: existing?.sort_order ?? 0,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
    },
    [],
  );

  /** Applies a change to one estimate, persisting it and rolling back the list on failure. */
  const mutateEstimate = useCallback(
    (id: string, mutate: (estimate: Estimate) => Estimate) => {
      setEstimates((prev) => {
        const existing = prev.find((e) => e.id === id);
        if (!existing) return prev;
        const snapshot = prev;
        const updated: Estimate = {
          ...mutate(existing),
          updated_at: new Date().toISOString(),
        };
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEstimate(updated),
            () => setEstimates(snapshot),
          );
        }
        return prev.map((e) => (e.id === id ? updated : e));
      });
    },
    [persistAsync],
  );

  const addEstimate = useCallback(
    (values: EstimateFormValues): Estimate => {
      ensureClientInRegistry(values.client_name);
      const estimate = estimateFromFormValues(values);
      setEstimates((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEstimate(estimate),
            () => setEstimates(snapshot),
          );
        }
        return [estimate, ...prev];
      });
      return estimate;
    },
    [estimateFromFormValues, ensureClientInRegistry, persistAsync],
  );

  const updateEstimate = useCallback(
    (id: string, values: EstimateFormValues) => {
      ensureClientInRegistry(values.client_name);
      mutateEstimate(id, (existing) => estimateFromFormValues(values, existing));
    },
    [ensureClientInRegistry, estimateFromFormValues, mutateEstimate],
  );

  const deleteEstimate = useCallback(
    (id: string) => {
      setEstimates((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.deleteEstimate(id),
            () => setEstimates(snapshot),
          );
        }
        return prev.filter((e) => e.id !== id);
      });
    },
    [persistAsync],
  );

  const setEstimateStage = useCallback(
    (id: string, stage: EstimateStage) => {
      mutateEstimate(id, (existing) => ({
        ...existing,
        stage,
        result: estimateResultForStage(stage),
        submitted_date:
          stage === "submitted" && !existing.submitted_date
            ? format(new Date(), "yyyy-MM-dd")
            : existing.submitted_date,
      }));
    },
    [mutateEstimate],
  );

  const markEstimateSubmitted = useCallback(
    (id: string, submittedDate?: string) => {
      mutateEstimate(id, (existing) => ({
        ...existing,
        stage: "submitted",
        result: "pending",
        submitted_date:
          submittedDate || existing.submitted_date || format(new Date(), "yyyy-MM-dd"),
      }));
    },
    [mutateEstimate],
  );

  const setEstimateResult = useCallback(
    (id: string, result: EstimateResult) => {
      mutateEstimate(id, (existing) => {
        if (result === "pending") {
          const reopened =
            existing.stage === "won" || existing.stage === "lost"
              ? "follow_up"
              : existing.stage;
          return { ...existing, result, stage: reopened };
        }
        return { ...existing, result, stage: result };
      });
    },
    [mutateEstimate],
  );

  const reviseEstimate = useCallback(
    (id: string): Estimate | null => {
      const source = estimates.find((e) => e.id === id);
      if (!source) return null;

      const now = new Date().toISOString();
      const revision: Estimate = {
        ...source,
        id: generateId(),
        revision_number: source.revision_number + 1,
        revises_estimate_id: source.id,
        stage: "pricing",
        result: "pending",
        submitted_date: undefined,
        checklist: source.checklist.map((item) => ({ ...item, done: false })),
        created_at: now,
        updated_at: now,
      };

      setEstimates((prev) => {
        const snapshot = prev;
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEstimate(revision),
            () => setEstimates(snapshot),
          );
        }
        return [revision, ...prev];
      });

      return revision;
    },
    [estimates, persistAsync],
  );

  const setEstimateChecklistItem = useCallback(
    (id: string, itemId: string, done: boolean) => {
      mutateEstimate(id, (existing) => ({
        ...existing,
        checklist: existing.checklist.map((item) =>
          item.id === itemId ? { ...item, done } : item,
        ),
      }));
    },
    [mutateEstimate],
  );

  const addEstimateChecklistItem = useCallback(
    (id: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      mutateEstimate(id, (existing) => ({
        ...existing,
        checklist: [...existing.checklist, { id: generateId(), label: trimmed, done: false }],
      }));
    },
    [mutateEstimate],
  );

  const removeEstimateChecklistItem = useCallback(
    (id: string, itemId: string) => {
      mutateEstimate(id, (existing) => ({
        ...existing,
        checklist: existing.checklist.filter((item) => item.id !== itemId),
      }));
    },
    [mutateEstimate],
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
    (id: string, values: EmployeeFormValues, allEmployees: Employee[]): Employee => {
      const takenHandles = new Set(
        allEmployees
          .filter((employee) => employee.id !== id)
          .map((employee) => employee.handle?.toLowerCase())
          .filter((handle): handle is string => Boolean(handle)),
      );
      const requestedHandle = values.handle?.trim();
      const handle = requestedHandle
        ? normalizeHandle(requestedHandle)
        : suggestEmployeeHandle(values, takenHandles);

      return {
        id,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        role: values.role,
        email: values.email?.trim() || undefined,
        handle: handle || undefined,
        department: values.department?.trim() || undefined,
        daily_capacity_hours: values.daily_capacity_hours,
        weekly_capacity_hours: values.weekly_capacity_hours,
        active: values.active,
      };
    },
    [],
  );

  const addEmployee = useCallback(
    (values: EmployeeFormValues): Employee => {
      let createdEmployee: Employee | null = null;
      setEmployees((prev) => {
        const snapshot = prev;
        const employee = employeeFromForm(generateId(), values, prev);
        createdEmployee = employee;
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
      return createdEmployee!;
    },
    [employeeFromForm, persistAsync, ensureTeamMemberOptions],
  );

  const updateEmployeeFromForm = useCallback(
    (id: string, values: EmployeeFormValues) => {
      ensureTeamMemberOptions(values);
      setEmployees((prev) => {
        const snapshot = prev;
        const employee = employeeFromForm(id, values, prev);
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
      todos,
      leads,
      leadNotes,
      estimates,
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
      renameClient,
      mergeClients,
      addProjectNote,
      updateProjectNote,
      deleteProjectNote,
      addClientNote,
      updateClientNote,
      deleteClientNote,
      addTodo,
      setTodoCompleted,
      deleteTodo,
      addLead,
      updateLead,
      deleteLead,
      addLeadNote,
      deleteLeadNote,
      convertLeadToProject,
      addEstimate,
      updateEstimate,
      deleteEstimate,
      setEstimateStage,
      markEstimateSubmitted,
      setEstimateResult,
      reviseEstimate,
      setEstimateChecklistItem,
      addEstimateChecklistItem,
      removeEstimateChecklistItem,
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
      toggleProjectMilestoneCompleted,
      updateProjectMilestoneAssigned,
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
      todos,
      leads,
      leadNotes,
      estimates,
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
      renameClient,
      mergeClients,
      addProjectNote,
      updateProjectNote,
      deleteProjectNote,
      addClientNote,
      updateClientNote,
      deleteClientNote,
      addTodo,
      setTodoCompleted,
      deleteTodo,
      addLead,
      updateLead,
      deleteLead,
      addLeadNote,
      deleteLeadNote,
      convertLeadToProject,
      addEstimate,
      updateEstimate,
      deleteEstimate,
      setEstimateStage,
      markEstimateSubmitted,
      setEstimateResult,
      reviseEstimate,
      setEstimateChecklistItem,
      addEstimateChecklistItem,
      removeEstimateChecklistItem,
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
      toggleProjectMilestoneCompleted,
      updateProjectMilestoneAssigned,
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
