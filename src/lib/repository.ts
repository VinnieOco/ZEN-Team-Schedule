import type {
  Allocation,
  AllocationCategory,
  CompanySettings,
  Employee,
  Project,
  TimeEntry,
} from "@/types";

export interface SchedulingRepository {
  listEmployees(): Promise<Employee[]>;
  listProjects(): Promise<Project[]>;
  listCategories(): Promise<AllocationCategory[]>;
  listAllocations(): Promise<Allocation[]>;
  listTimeEntries(): Promise<TimeEntry[]>;
  getSettings(): Promise<CompanySettings>;
  upsertAllocation(allocation: Allocation): Promise<Allocation>;
  deleteAllocation(id: string): Promise<void>;
  upsertTimeEntry(entry: TimeEntry): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;
  upsertProject(project: Project): Promise<Project>;
  upsertEmployee(employee: Employee): Promise<Employee>;
  updateSettings(settings: CompanySettings): Promise<CompanySettings>;
}
