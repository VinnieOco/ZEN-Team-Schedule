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
  mapLeadFollowUp,
  mapLeadNote,
  mapEstimate,
  estimateToRow,
  projectNoteToRow,
  projectToRow,
  settingsToRow,
  timeEntryToRow,
  todoToRow,
  leadToRow,
  leadFollowUpToRow,
  leadNoteToRow,
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
import {
  listAllRows,
  type InclusiveDateRange,
} from "@/lib/data/list-all-rows";
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
  LeadFollowUp,
  LeadNote,
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
      const data = await listAllRows(supabase, "projects", [
        { column: "project_name" },
        { column: "id" },
      ]);
      return data.map((row) => mapProject(row as Parameters<typeof mapProject>[0]));
    },

    async listCategories() {
      const { data, error } = await supabase
        .from("allocation_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map(mapCategory);
    },

    async listAllocations(range?: InclusiveDateRange) {
      const data = await listAllRows(
        supabase,
        "allocations",
        [
          { column: "allocation_date" },
          { column: "id" },
        ],
        range
          ? { column: "allocation_date", gte: range.from, lte: range.to }
          : undefined,
      );
      return data.map((row) => mapAllocation(row as Parameters<typeof mapAllocation>[0]));
    },

    async listTimeEntries(range?: InclusiveDateRange) {
      const data = await listAllRows(
        supabase,
        "time_entries",
        [
          { column: "entry_date" },
          { column: "id" },
        ],
        range
          ? { column: "entry_date", gte: range.from, lte: range.to }
          : undefined,
      );
      return data.map((row) => mapTimeEntry(row as Parameters<typeof mapTimeEntry>[0]));
    },

    async listProjectNotes() {
      const data = await listAllRows(supabase, "project_notes", [
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) => mapProjectNote(row as Parameters<typeof mapProjectNote>[0]));
    },

    async listClientNotes() {
      const data = await listAllRows(supabase, "client_notes", [
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) => mapClientNote(row as Parameters<typeof mapClientNote>[0]));
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
      const data = await listAllRows(supabase, "clients", [
        { column: "name" },
        { column: "id" },
      ]);
      return data.map((row) => mapClient(row as Parameters<typeof mapClient>[0]));
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

    async deleteProject(id: string) {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },

    async mergeProjects(sourceId: string, targetId: string, mergedTarget: Project) {
      if (sourceId === targetId) {
        throw new Error("Cannot merge a project with itself.");
      }

      const reassign = async (table: string, column: string) => {
        const { error } = await supabase
          .from(table)
          .update({ [column]: targetId })
          .eq(column, sourceId);
        if (error) throw error;
      };

      await reassign("allocations", "project_id");
      await reassign("time_entries", "project_id");
      await reassign("project_notes", "project_id");
      await reassign("estimates", "project_id");
      await reassign("todos", "source_project_id");
      await reassign("leads", "converted_project_id");

      const { error: parentError } = await supabase
        .from("projects")
        .update({ parent_project_id: targetId, is_change_order: true })
        .eq("parent_project_id", sourceId);
      if (parentError) throw parentError;

      const row = projectToRow(mergedTarget);
      const { id: _id, ...updates } = row;
      const { error: targetError } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", targetId);
      if (targetError) throw targetError;

      const { error: deleteError } = await supabase.from("projects").delete().eq("id", sourceId);
      if (deleteError) throw deleteError;
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
      const data = await listAllRows(supabase, "todos", [
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) => mapTodo(row as Parameters<typeof mapTodo>[0]));
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
      const data = await listAllRows(supabase, "leads", [
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) => mapLead(row as Parameters<typeof mapLead>[0]));
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

    async listLeadNotes() {
      const data = await listAllRows(supabase, "lead_notes", [
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) => mapLeadNote(row as Parameters<typeof mapLeadNote>[0]));
    },

    async insertLeadNote(note: LeadNote) {
      const { data, error } = await supabase
        .from("lead_notes")
        .insert(leadNoteToRow(note))
        .select()
        .single();
      if (error) throw error;
      return mapLeadNote(data);
    },

    async listLeadFollowUps() {
      const data = await listAllRows(supabase, "lead_follow_ups", [
        { column: "due_date", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) =>
        mapLeadFollowUp(row as Parameters<typeof mapLeadFollowUp>[0]),
      );
    },

    async upsertLeadFollowUp(followUp: LeadFollowUp) {
      const { data, error } = await supabase
        .from("lead_follow_ups")
        .upsert(leadFollowUpToRow(followUp))
        .select()
        .single();
      if (error) throw error;
      return mapLeadFollowUp(data);
    },

    async deleteLeadFollowUp(id: string) {
      const { error } = await supabase.from("lead_follow_ups").delete().eq("id", id);
      if (error) throw error;
    },

    async deleteLeadNote(id: string) {
      const { error } = await supabase.from("lead_notes").delete().eq("id", id);
      if (error) throw error;
    },

    async listEstimates() {
      const data = await listAllRows(supabase, "estimates", [
        { column: "sort_order", ascending: true },
        { column: "created_at", ascending: false },
        { column: "id", ascending: false },
      ]);
      return data.map((row) => mapEstimate(row as Parameters<typeof mapEstimate>[0]));
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
