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
  deleteEmployee(id: string): Promise<void>;
  upsertCategory(category: AllocationCategory): Promise<AllocationCategory>;
  deleteCategory(id: string): Promise<void>;
  updateSettings(settings: CompanySettings): Promise<CompanySettings>;
}
