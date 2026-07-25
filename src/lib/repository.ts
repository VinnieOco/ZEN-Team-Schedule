import type { QueueStateSnapshot } from "@/lib/queue/queue-state-types";
import type {
  Allocation,
  AllocationCategory,
  Client,
  CompanySettings,
  Employee,
  Estimate,
  Lead,
  LeadNote,
  Project,
  ClientNote,
  ProjectNote,
  ProjectMilestone,
  ScheduledProjectPhase,
  TimeEntry,
  Todo,
  TodoNoteSourceType,
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
  syncProjectPhases(projectId: string, phases: ScheduledProjectPhase[]): Promise<void>;
  listProjectMilestones(): Promise<ProjectMilestone[]>;
  syncProjectMilestones(projectId: string, milestones: ProjectMilestone[]): Promise<void>;
  listClients(): Promise<Client[]>;
  upsertClient(client: Client): Promise<Client>;
  updateClient(client: Client): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  rekeyClientNotes(oldKey: string, newKey: string): Promise<void>;
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
  listTodos(): Promise<Todo[]>;
  upsertTodo(todo: Todo): Promise<Todo>;
  deleteTodo(id: string): Promise<void>;
  deleteMentionTodosForNote(noteId: string, noteType: TodoNoteSourceType): Promise<void>;
  listLeads(): Promise<Lead[]>;
  upsertLead(lead: Lead): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  listLeadNotes(): Promise<LeadNote[]>;
  insertLeadNote(note: LeadNote): Promise<LeadNote>;
  deleteLeadNote(id: string): Promise<void>;
  listEstimates(): Promise<Estimate[]>;
  upsertEstimate(estimate: Estimate): Promise<Estimate>;
  deleteEstimate(id: string): Promise<void>;
  upsertEmployee(employee: Employee): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  upsertCategory(category: AllocationCategory): Promise<AllocationCategory>;
  deleteCategory(id: string): Promise<void>;
  updateSettings(settings: CompanySettings): Promise<CompanySettings>;
}
