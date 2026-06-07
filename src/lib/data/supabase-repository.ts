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
  projectNoteToRow,
  projectToRow,
  settingsToRow,
  timeEntryToRow,
} from "@/lib/data/mappers";
import { listQueueState as fetchQueueState } from "@/lib/data/queue-repository";
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
  TimeEntry,
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
