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
import { addWeeks, subWeeks } from "date-fns";

import {
  categories as seedCategories,
  companySettings as seedSettings,
  employees as seedEmployees,
  initialAllocations,
  projects as seedProjects,
} from "@/data/mock-data";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SchedulingRepository } from "@/lib/repository";
import { getWeekStart } from "@/lib/week";
import type {
  Allocation,
  AllocationCategory,
  AllocationFormValues,
  CompanySettings,
  Employee,
  Project,
  EmployeeFormValues,
  ProjectFormValues,
  SchedulingFilters,
} from "@/types";

const STORAGE_KEY = "zen-scheduling-state";

type DataSource = "local" | "supabase";

interface PersistedState {
  employees: Employee[];
  projects: Project[];
  allocations: Allocation[];
  settings: CompanySettings;
}

interface SchedulingContextValue {
  dataSource: DataSource;
  isLoading: boolean;
  error: string | null;
  employees: Employee[];
  projects: Project[];
  categories: AllocationCategory[];
  allocations: Allocation[];
  settings: CompanySettings;
  selectedWeekStart: Date;
  filters: SchedulingFilters;
  setWeek: (date: Date) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  setFilters: (filters: Partial<SchedulingFilters>) => void;
  clearFilters: () => void;
  addAllocation: (values: AllocationFormValues) => Allocation;
  updateAllocation: (id: string, values: AllocationFormValues) => void;
  moveAllocation: (id: string, employeeId: string, allocationDate: string) => void;
  deleteAllocation: (id: string) => void;
  duplicateAllocation: (id: string) => Allocation;
  addProject: (values: ProjectFormValues) => Project;
  updateProject: (id: string, values: ProjectFormValues) => void;
  updateSettings: (settings: Partial<CompanySettings>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  addEmployee: (values: EmployeeFormValues) => Employee;
  updateEmployeeFromForm: (id: string, values: EmployeeFormValues) => void;
  getCategoryById: (id: string) => AllocationCategory | undefined;
  getProjectById: (id: string) => Project | undefined;
  getEmployeeById: (id: string) => Employee | undefined;
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

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const useSupabase = isSupabaseConfigured();
  const repoRef = useRef<SchedulingRepository | null>(null);

  const persisted = !useSupabase ? loadPersistedState() : null;

  const [dataSource] = useState<DataSource>(useSupabase ? "supabase" : "local");
  const [isLoading, setIsLoading] = useState(useSupabase);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? seedEmployees);
  const [projects, setProjects] = useState<Project[]>(persisted?.projects ?? seedProjects);
  const [categories, setCategories] = useState<AllocationCategory[]>(seedCategories);
  const [allocations, setAllocations] = useState<Allocation[]>(
    persisted?.allocations ?? initialAllocations,
  );
  const [settings, setSettings] = useState<CompanySettings>(persisted?.settings ?? seedSettings);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() =>
    getWeekStart(new Date(), seedSettings),
  );
  const [filters, setFiltersState] = useState<SchedulingFilters>({
    search: "",
    projectId: null,
    categoryId: null,
    showHours: true,
  });

  const refreshData = useCallback(async () => {
    if (!useSupabase) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      repoRef.current = createSupabaseRepository(supabase);
      const repo = repoRef.current;
      const [emp, proj, cats, alloc, sett] = await Promise.all([
        repo.listEmployees(),
        repo.listProjects(),
        repo.listCategories(),
        repo.listAllocations(),
        repo.getSettings(),
      ]);
      setEmployees(emp);
      setProjects(proj);
      setCategories(cats.length > 0 ? cats : seedCategories);
      setAllocations(alloc);
      setSettings(sett);
      setSelectedWeekStart(getWeekStart(new Date(), sett));
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
    const payload: PersistedState = { employees, projects, allocations, settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [useSupabase, employees, projects, allocations, settings]);

  const persistAsync = useCallback(
    async <T,>(action: () => Promise<T>, rollback: () => void): Promise<T | undefined> => {
      if (!repoRef.current) return undefined;
      try {
        return await action();
      } catch (err) {
        rollback();
        setError(err instanceof Error ? err.message : "Save failed");
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

  const goToPreviousWeek = useCallback(() => {
    setSelectedWeekStart((prev) => getWeekStart(subWeeks(prev, 1), settings));
  }, [settings]);

  const goToNextWeek = useCallback(() => {
    setSelectedWeekStart((prev) => getWeekStart(addWeeks(prev, 1), settings));
  }, [settings]);

  const goToToday = useCallback(() => {
    setSelectedWeekStart(getWeekStart(new Date(), settings));
  }, [settings]);

  const setFilters = useCallback((partial: Partial<SchedulingFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({
      search: "",
      projectId: null,
      categoryId: null,
      showHours: true,
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

  const addProject = useCallback(
    (values: ProjectFormValues): Project => {
      const project: Project = {
        id: generateId(),
        project_name: values.project_name,
        client_name: values.client_name,
        status: values.status,
        phase: values.phase,
        lead_employee_id: values.lead_employee_id,
        budgeted_design_hours: values.budgeted_design_hours,
        target_completion_date: values.target_completion_date,
        project_number: values.project_number,
        notes: values.notes,
        active: true,
      };
      setProjects((prev) => [...prev, project]);
      if (repoRef.current) {
        const snapshot = projects;
        persistAsync(
          () => repoRef.current!.upsertProject(project),
          () => setProjects(snapshot),
        );
      }
      return project;
    },
    [projects, persistAsync],
  );

  const updateProject = useCallback(
    (id: string, values: ProjectFormValues) => {
      setProjects((prev) => {
        const snapshot = prev;
        const next = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                project_name: values.project_name,
                client_name: values.client_name,
                status: values.status,
                phase: values.phase,
                lead_employee_id: values.lead_employee_id,
                budgeted_design_hours: values.budgeted_design_hours,
                target_completion_date: values.target_completion_date,
                project_number: values.project_number,
                notes: values.notes,
              }
            : p,
        );
        const merged = next.find((p) => p.id === id);
        if (merged && repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertProject(merged),
            () => setProjects(snapshot),
          );
        }
        return next;
      });
    },
    [persistAsync],
  );

  const updateSettings = useCallback(
    (partial: Partial<CompanySettings>) => {
      const snapshot = settings;
      const next = { ...settings, ...partial };
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
          );
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
          persistAsync(
            () => repoRef.current!.upsertEmployee(employee),
            () => setEmployees(snapshot),
          );
        }
        return next;
      });
      return employee;
    },
    [employeeFromForm, persistAsync],
  );

  const updateEmployeeFromForm = useCallback(
    (id: string, values: EmployeeFormValues) => {
      const employee = employeeFromForm(id, values);
      setEmployees((prev) => {
        const snapshot = prev;
        const next = prev.map((e) => (e.id === id ? employee : e));
        if (repoRef.current) {
          void persistAsync(
            () => repoRef.current!.upsertEmployee(employee),
            () => setEmployees(snapshot),
          );
        }
        return next;
      });
    },
    [employeeFromForm, persistAsync],
  );

  const value = useMemo(
    () => ({
      dataSource,
      isLoading,
      error,
      employees,
      projects,
      categories,
      allocations,
      settings,
      selectedWeekStart,
      filters,
      setWeek,
      goToPreviousWeek,
      goToNextWeek,
      goToToday,
      setFilters,
      clearFilters,
      addAllocation,
      updateAllocation,
      moveAllocation,
      deleteAllocation,
      duplicateAllocation,
      addProject,
      updateProject,
      updateSettings,
      updateEmployee,
      addEmployee,
      updateEmployeeFromForm,
      getCategoryById,
      getProjectById,
      getEmployeeById,
      refreshData,
    }),
    [
      dataSource,
      isLoading,
      error,
      employees,
      projects,
      categories,
      allocations,
      settings,
      selectedWeekStart,
      filters,
      setWeek,
      goToPreviousWeek,
      goToNextWeek,
      goToToday,
      setFilters,
      clearFilters,
      addAllocation,
      updateAllocation,
      moveAllocation,
      deleteAllocation,
      duplicateAllocation,
      addProject,
      updateProject,
      updateSettings,
      updateEmployee,
      addEmployee,
      updateEmployeeFromForm,
      getCategoryById,
      getProjectById,
      getEmployeeById,
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
