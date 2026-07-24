import type { SupabaseClient } from "@supabase/supabase-js";

import {
  allocationToRow,
  categoryToRow,
  employeeToRow,
  mapAllocation,
  mapCategory,
  mapEmployee,
  mapProject,
  mapClient,
  mapClientNote,
  mapProjectNote,
  clientNoteToRow,
  clientToRow,
  mapSettings,
  mapTimeEntry,
  mapTodo,
  mapLead,
  mapEstimate,
  estimateToRow,
  projectNoteToRow,
  projectToRow,
  settingsToRow,
  timeEntryToRow,
  todoToRow,
  leadToRow,
} from "@/lib/data/mappers";
import { listQueueState as fetchQueueState } from "@/lib/data/queue-repository";
import {
  insertProjectPhases as insertPhases,
  listProjectPhases as fetchProjectPhases,
  syncProjectPhases as syncPhases,
  upsertProjectPhases as upsertPhases,
} from "@/lib/data/project-phases-repository";
import {
  listProjectMilestones as fetchProjectMilestones,
  syncProjectMilestones as syncMilestones,
} from "@/lib/data/project-milestones-repository";
import type { SchedulingRepository } from "@/lib/repository";
import type {
  Allocation,
  AllocationCategory,
  Client,
  CompanySettings,
  Employee,
  Project,
  ClientNote,
  ProjectNote,
  ProjectMilestone,
  ScheduledProjectPhase,
  TimeEntry,
  Todo,
  Lead,
  Estimate,
  TodoNoteSourceType,
} from "@/types";

export function createSupabaseRepository(
  supabase: SupabaseClient,
): SchedulingRepository {
  return {
    async listEmployees() {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("last_name");
      if (error) throw error;
      return (data ?? []).map(mapEmployee);
    },

    async listProjects() {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("project_name");
      if (error) throw error;
      return (data ?? []).map(mapProject);
    },

    async listCategories() {
      const { data, error } = await supabase
        .from("allocation_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map(mapCategory);
    },

    async listAllocations() {
      const { data, error } = await supabase
        .from("allocations")
        .select("*")
        .order("allocation_date");
      if (error) throw error;
      return (data ?? []).map(mapAllocation);
    },

    async listTimeEntries() {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .order("entry_date");
      if (error) throw error;
      return (data ?? []).map(mapTimeEntry);
    },

    async listProjectNotes() {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapProjectNote);
    },

    async listClientNotes() {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapClientNote);
    },

    async listQueueState() {
      return fetchQueueState(supabase);
    },

    async listProjectPhases() {
      return fetchProjectPhases(supabase);
    },

    async upsertProjectPhases(phases: ScheduledProjectPhase[]) {
      return upsertPhases(supabase, phases);
    },

    async insertProjectPhases(phases: ScheduledProjectPhase[]) {
      return insertPhases(supabase, phases);
    },

    async syncProjectPhases(projectId: string, phases: ScheduledProjectPhase[]) {
      return syncPhases(supabase, projectId, phases);
    },

    async listProjectMilestones() {
      return fetchProjectMilestones(supabase);
    },

    async syncProjectMilestones(projectId: string, milestones: ProjectMilestone[]) {
      return syncMilestones(supabase, projectId, milestones);
    },

    async listClients() {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapClient);
    },

    async upsertClient(client: Client) {
      const { data, error } = await supabase
        .from("clients")
        .upsert(clientToRow(client))
        .select()
        .single();
      if (error) throw error;
      return mapClient(data);
    },

    async updateClient(client: Client) {
      const { data, error } = await supabase
        .from("clients")
        .update(clientToRow(client))
        .eq("id", client.id)
        .select()
        .single();
      if (error) throw error;
      return mapClient(data);
    },

    async deleteClient(id: string) {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },

    async rekeyClientNotes(oldKey: string, newKey: string) {
      const normalizedOld = oldKey.trim().toLowerCase();
      const normalizedNew = newKey.trim().toLowerCase();
      if (!normalizedOld || !normalizedNew || normalizedOld === normalizedNew) return;

      const { error } = await supabase
        .from("client_notes")
        .update({ client_key: normalizedNew })
        .eq("client_key", normalizedOld);
      if (error) throw error;
    },

    async getSettings() {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("No company settings found. Run supabase/seed.sql");
      }
      return mapSettings(data);
    },

    async upsertAllocation(allocation: Allocation) {
      const { data, error } = await supabase
        .from("allocations")
        .upsert(allocationToRow(allocation))
        .select()
        .single();
      if (error) throw error;
      return mapAllocation(data);
    },

    async deleteAllocation(id: string) {
      const { error } = await supabase.from("allocations").delete().eq("id", id);
      if (error) throw error;
    },

    async upsertTimeEntry(entry: TimeEntry) {
      const { data, error } = await supabase
        .from("time_entries")
        .upsert(timeEntryToRow(entry))
        .select()
        .single();
      if (error) throw error;
      return mapTimeEntry(data);
    },

    async deleteTimeEntry(id: string) {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },

    async upsertProject(project: Project) {
      const { data, error } = await supabase
        .from("projects")
        .upsert(projectToRow(project))
        .select()
        .single();
      if (error) throw error;
      return mapProject(data);
    },

    async updateProject(project: Project) {
      const row = projectToRow(project);
      const { id: _id, ...updates } = row;
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", project.id)
        .select()
        .single();
      if (error) throw error;
      return mapProject(data);
    },

    async insertProjectNote(note: ProjectNote) {
      const { data, error } = await supabase
        .from("project_notes")
        .insert(projectNoteToRow(note))
        .select()
        .single();
      if (error) throw error;
      return mapProjectNote(data);
    },

    async updateProjectNote(note: ProjectNote) {
      const { data, error } = await supabase
        .from("project_notes")
        .update({
          body: note.body.trim(),
          updated_at: note.updated_at,
        })
        .eq("id", note.id)
        .select()
        .single();
      if (error) throw error;
      return mapProjectNote(data);
    },

    async deleteProjectNote(id: string) {
      const { error } = await supabase.from("project_notes").delete().eq("id", id);
      if (error) throw error;
    },

    async insertClientNote(note: ClientNote) {
      const { data, error } = await supabase
        .from("client_notes")
        .insert(clientNoteToRow(note))
        .select()
        .single();
      if (error) throw error;
      return mapClientNote(data);
    },

    async updateClientNote(note: ClientNote) {
      const { data, error } = await supabase
        .from("client_notes")
        .update({
          body: note.body.trim(),
          updated_at: note.updated_at,
        })
        .eq("id", note.id)
        .select()
        .single();
      if (error) throw error;
      return mapClientNote(data);
    },

    async deleteClientNote(id: string) {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },

    async listTodos() {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapTodo);
    },

    async upsertTodo(todo: Todo) {
      const row = todoToRow(todo);
      const isMentionTodo =
        todo.source_type === "mention" && todo.source_note_id && todo.source_note_type;

      const { data, error } = await supabase
        .from("todos")
        .upsert(row, isMentionTodo ? { onConflict: "employee_id,source_note_id,source_note_type" } : undefined)
        .select()
        .single();
      if (error) throw error;
      return mapTodo(data);
    },

    async deleteTodo(id: string) {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },

    async deleteMentionTodosForNote(noteId: string, noteType: TodoNoteSourceType) {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("source_note_id", noteId)
        .eq("source_note_type", noteType)
        .eq("source_type", "mention");
      if (error) throw error;
    },

    async listLeads() {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapLead);
    },

    async upsertLead(lead: Lead) {
      const { data, error } = await supabase
        .from("leads")
        .upsert(leadToRow(lead))
        .select()
        .single();
      if (error) throw error;
      return mapLead(data);
    },

    async deleteLead(id: string) {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },

    async listEstimates() {
      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapEstimate);
    },

    async upsertEstimate(estimate: Estimate) {
      const { data, error } = await supabase
        .from("estimates")
        .upsert(estimateToRow(estimate))
        .select()
        .single();
      if (error) throw error;
      return mapEstimate(data);
    },

    async deleteEstimate(id: string) {
      const { error } = await supabase.from("estimates").delete().eq("id", id);
      if (error) throw error;
    },

    async upsertEmployee(employee: Employee) {
      const { data, error } = await supabase
        .from("employees")
        .upsert(employeeToRow(employee))
        .select()
        .single();
      if (error) throw error;
      return mapEmployee(data);
    },

    async deleteEmployee(id: string) {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },

    async upsertCategory(category: AllocationCategory) {
      const { data, error } = await supabase
        .from("allocation_categories")
        .upsert(categoryToRow(category))
        .select()
        .single();
      if (error) throw error;
      return mapCategory(data);
    },

    async deleteCategory(id: string) {
      const { error } = await supabase.from("allocation_categories").delete().eq("id", id);
      if (error) throw error;
    },

    async updateSettings(settings: CompanySettings) {
      const { data, error } = await supabase
        .from("company_settings")
        .upsert(settingsToRow(settings))
        .select()
        .single();
      if (error) throw error;
      return mapSettings(data);
    },
  };
}
