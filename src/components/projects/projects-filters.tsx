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
import { getEmployeeFullName } from "@/lib/week";

interface ProjectsFiltersProps {
  filters: ProjectFilters;
  onChange: (partial: Partial<ProjectFilters>) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

export function ProjectsFilters({
  filters,
  onChange,
  onClear,
  resultCount,
  totalCount,
}: ProjectsFiltersProps) {
  const { employees, settings, projects } = useScheduling();
  const departmentOptions = [
    ...new Set([
      ...getDepartmentOptions(settings, employees).filter((d) => d !== UNASSIGNED_DEPARTMENT),
      ...projects.map((p) => p.department?.trim()).filter(Boolean) as string[],
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const leadOptions = employees
    .filter((e) => e.active)
    .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)));

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
      ...leadOptions.map((employee) => ({
        value: employee.id,
        label: getEmployeeFullName(employee),
        keywords: [employee.email, employee.department].filter(Boolean).join(" "),
      })),
    ],
    [leadOptions],
  );

  return (
    <div className="min-w-0 space-y-3 rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="relative min-w-[min(100%,240px)] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, client, number, lead..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>
        <SearchableSelect
          options={departmentFilterOptions}
          value={filters.department ?? "all"}
          onValueChange={(v) => onChange({ department: v === "all" ? null : v })}
          placeholder="Department"
          searchPlaceholder="Search departments…"
          className="w-full sm:w-[200px]"
        />
        <SearchableSelect
          options={phaseFilterOptions}
          value={filters.phase ?? "all"}
          onValueChange={(v) => onChange({ phase: v === "all" ? null : v })}
          placeholder="Phase"
          searchPlaceholder="Search phases…"
          className="w-full sm:w-[200px]"
        />
        <SearchableSelect
          options={leadFilterOptions}
          value={filters.leadEmployeeId ?? "all"}
          onValueChange={(v) => onChange({ leadEmployeeId: v === "all" ? null : v })}
          placeholder="Lead designer"
          searchPlaceholder="Search leads…"
          className="w-full sm:w-[200px]"
        />
        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive-projects"
              checked={filters.showInactive}
              onCheckedChange={(v) => onChange({ showInactive: v })}
            />
            <Label htmlFor="show-inactive-projects" className="text-sm font-normal">
              Show inactive projects
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
          Showing {resultCount} of {totalCount} project{totalCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
