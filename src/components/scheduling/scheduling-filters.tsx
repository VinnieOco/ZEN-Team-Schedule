"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Search, Settings, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { departmentFilterLabel } from "@/lib/departments";
import { buildGroupedProjectSelectOptions } from "@/lib/project-picker-options";
import { getDepartmentOptions } from "@/lib/team-options";

interface SchedulingFiltersProps {
  /** Show toggle to hide members/projects with no allocations in the period. */
  showScheduledOnlyToggle?: boolean;
}

export function SchedulingFilters({ showScheduledOnlyToggle = false }: SchedulingFiltersProps) {
  const { employees, projects, categories, filters, settings, setFilters, clearFilters } =
    useScheduling();

  const departments = getDepartmentOptions(settings, employees);

  const departmentOptions = useMemo(
    () => [
      { value: "all", label: "All departments" },
      ...departments.map((dept) => ({
        value: dept,
        label: departmentFilterLabel(dept),
      })),
    ],
    [departments],
  );

  const projectOptions = useMemo(
    () => [
      { value: "all", label: "All projects" },
      ...buildGroupedProjectSelectOptions(projects, {
        formatParentLabel: (project) => project.project_name,
      }),
    ],
    [projects],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.department) ||
    Boolean(filters.projectId) ||
    Boolean(filters.categoryId) ||
    filters.onlyWithAllocations;

  return (
    <div className="min-w-0 space-y-3 rounded-lg border bg-white p-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <SearchableSelect
          options={departmentOptions}
          value={filters.department ?? "all"}
          onValueChange={(v) => setFilters({ department: v === "all" ? null : v })}
          placeholder="Department"
          searchPlaceholder="Search departments…"
          className="w-full sm:w-[180px]"
        />
        <div className="relative min-w-[min(100%,240px)] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search team members..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
        <SearchableSelect
          options={projectOptions}
          value={filters.projectId ?? "all"}
          onValueChange={(v) => setFilters({ projectId: v === "all" ? null : v })}
          placeholder="Filter by project"
          searchPlaceholder="Search projects…"
          className="w-full sm:w-[200px]"
        />
        <SearchableSelect
          options={categoryOptions}
          value={filters.categoryId ?? "all"}
          onValueChange={(v) => setFilters({ categoryId: v === "all" ? null : v })}
          placeholder="Filter by category"
          searchPlaceholder="Search categories…"
          className="w-full sm:w-[200px]"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="show-hours"
            checked={filters.showHours}
            onCheckedChange={(v) => setFilters({ showHours: v })}
          />
          <Label htmlFor="show-hours" className="text-sm whitespace-nowrap">
            Show hours
          </Label>
        </div>
        {showScheduledOnlyToggle && (
          <div className="flex items-center gap-2">
            <Switch
              id="only-with-allocations"
              checked={filters.onlyWithAllocations}
              onCheckedChange={(v) => setFilters({ onlyWithAllocations: v })}
            />
            <Label htmlFor="only-with-allocations" className="text-sm whitespace-nowrap">
              Scheduled only
            </Label>
          </div>
        )}
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-slate-50"
          title="Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.department && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {departmentFilterLabel(filters.department)}
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                onClick={() => setFilters({ department: null })}
                aria-label="Clear department filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: {filters.search}
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                onClick={() => setFilters({ search: "" })}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.projectId && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Project filter
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                onClick={() => setFilters({ projectId: null })}
                aria-label="Clear project filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Category filter
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                onClick={() => setFilters({ categoryId: null })}
                aria-label="Clear category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.onlyWithAllocations && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Scheduled only
              <button
                type="button"
                className="ml-1 rounded-full p-0.5 hover:bg-slate-200"
                onClick={() => setFilters({ onlyWithAllocations: false })}
                aria-label="Show all members and projects"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
