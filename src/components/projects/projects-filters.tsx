"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { UNASSIGNED_DEPARTMENT } from "@/lib/departments";
import { getDepartmentOptions } from "@/lib/team-options";
import { PROJECT_PHASES } from "@/lib/project-options";
import { projectFiltersActive, type ProjectFilters } from "@/lib/filter-projects";
import { buildEmployeeSelectOptions } from "@/lib/employee-picker-options";

interface ProjectsFiltersProps {
  filters: ProjectFilters;
  onChange: (partial: Partial<ProjectFilters>) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
  /** Plural label for the result summary line (default: projects). */
  resultNoun?: string;
}

export function ProjectsFilters({
  filters,
  onChange,
  onClear,
  resultCount,
  totalCount,
  resultNoun = "project",
}: ProjectsFiltersProps) {
  const { employees, settings, projects } = useScheduling();
  const departmentOptions = [
    ...new Set([
      ...getDepartmentOptions(settings, employees).filter((d) => d !== UNASSIGNED_DEPARTMENT),
      ...projects.map((p) => p.department?.trim()).filter(Boolean) as string[],
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const hasActiveFilters = projectFiltersActive(filters);

  const departmentFilterOptions = useMemo(
    () => [
      { value: "all", label: "All departments" },
      ...departmentOptions.map((dept) => ({ value: dept, label: dept })),
    ],
    [departmentOptions],
  );

  const phaseFilterOptions = useMemo(
    () => [
      { value: "all", label: "All phases" },
      ...PROJECT_PHASES.map((phase) => ({ value: phase, label: phase })),
    ],
    [],
  );

  const leadFilterOptions = useMemo(
    () => [
      { value: "all", label: "All leads" },
      ...buildEmployeeSelectOptions(employees),
    ],
    [employees],
  );

  return (
    <div className="min-w-0 space-y-3 rounded-lg border bg-white p-3 shadow-sm">
      <div className="space-y-3">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, client, number, lead..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SearchableSelect
            options={departmentFilterOptions}
            value={filters.department ?? "all"}
            onValueChange={(v) => onChange({ department: v === "all" ? null : v })}
            placeholder="Department"
            searchPlaceholder="Search departments…"
            className="w-full"
          />
          <SearchableSelect
            options={phaseFilterOptions}
            value={filters.phase ?? "all"}
            onValueChange={(v) => onChange({ phase: v === "all" ? null : v })}
            placeholder="Phase"
            searchPlaceholder="Search phases…"
            className="w-full"
          />
          <SearchableSelect
            options={leadFilterOptions}
            value={filters.leadEmployeeId ?? "all"}
            onValueChange={(v) => onChange({ leadEmployeeId: v === "all" ? null : v })}
            placeholder="Lead designer"
            searchPlaceholder="Search leads…"
            className="w-full sm:col-span-2 lg:col-span-1"
          />
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={onClear}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive-projects"
              checked={filters.showInactive}
              onCheckedChange={(v) => onChange({ showInactive: v })}
            />
            <Label htmlFor="show-inactive-projects" className="text-sm font-normal">
              Show inactive
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-change-orders"
              checked={filters.showChangeOrders}
              onCheckedChange={(v) => onChange({ showChangeOrders: v })}
            />
            <Label htmlFor="show-change-orders" className="text-sm font-normal">
              Show change orders
            </Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {resultCount} of {totalCount} {resultNoun}
          {totalCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
