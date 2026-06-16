import type { QueueStateSnapshot } from "@/lib/queue/queue-state-types";
import type {
  Allocation,
  AllocationCategory,
  Client,
  CompanySettings,
  Employee,
  Project,
  ClientNote,
  ProjectNote,
  ScheduledProjectPhase,
  TimeEntry,
} from "@/types";

export interface SchedulingRepository {
  listEmployees(): Promise<Employee[]>;
  listProjects(): Promise<Project[]>;
  listCategories(): Promise<AllocationCategory[]>;
  listAllocations(): Promise<Allocation[]>;
  listTimeEntries(): Promise<TimeEntry[]>;
  listProjectNotes(): Promise<ProjectNote[]>;
  listClientNotes(): Promise<ClientNote[]>;
  listQueueState(): Promise<QueueStateSnapshot>;
  listProjectPhases(): Promise<ScheduledProjectPhase[]>;
  upsertProjectPhases(phases: ScheduledProjectPhase[]): Promise<void>;
  insertProjectPhases(phases: ScheduledProjectPhase[]): Promise<void>;
  listClients(): Promise<Client[]>;
  upsertClient(client: Client): Promise<Client>;
  updateClient(client: Client): Promise<Client>;
  getSettings(): Promise<CompanySettings>;
  upsertAllocation(allocation: Allocation): Promise<Allocation>;
  deleteAllocation(id: string): Promise<void>;
  upsertTimeEntry(entry: TimeEntry): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;
  upsertProject(project: Project): Promise<Project>;
  updateProject(project: Project): Promise<Project>;
  insertProjectNote(note: ProjectNote): Promise<ProjectNote>;
  updateProjectNote(note: ProjectNote): Promise<ProjectNote>;
  deleteProjectNote(id: string): Promise<void>;
  insertClientNote(note: ClientNote): Promise<ClientNote>;
  updateClientNote(note: ClientNote): Promise<ClientNote>;
  deleteClientNote(id: string): Promise<void>;
  upsertEmployee(employee: Employee): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  upsertCategory(category: AllocationCategory): Promise<AllocationCategory>;
  deleteCategory(id: string): Promise<void>;
  updateSettings(settings: CompanySettings): Promise<CompanySettings>;
}
