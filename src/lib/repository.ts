import type {
  Allocation,
  AllocationCategory,
  CompanySettings,
  Employee,
  Project,
} from "@/types";

export interface SchedulingRepository {
  listEmployees(): Promise<Employee[]>;
  listProjects(): Promise<Project[]>;
  listCategories(): Promise<AllocationCategory[]>;
  listAllocations(): Promise<Allocation[]>;
  getSettings(): Promise<CompanySettings>;
  upsertAllocation(allocation: Allocation): Promise<Allocation>;
  deleteAllocation(id: string): Promise<void>;
  upsertProject(project: Project): Promise<Project>;
  upsertEmployee(employee: Employee): Promise<Employee>;
  updateSettings(settings: CompanySettings): Promise<CompanySettings>;
}
