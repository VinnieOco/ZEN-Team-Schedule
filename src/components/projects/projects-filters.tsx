"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { PROJECT_PHASES, PROJECT_STATUSES } from "@/lib/project-options";
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
  const { employees } = useScheduling();

  const leadOptions = employees
    .filter((e) => e.active)
    .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)));

  const hasActiveFilters = projectFiltersActive(filters);

  return (
    <div className="space-y-3 rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[min(100%,240px)] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, client, number, lead..."
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => onChange({ status: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.phase ?? "all"}
          onValueChange={(v) => onChange({ phase: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All phases</SelectItem>
            {PROJECT_PHASES.map((phase) => (
              <SelectItem key={phase} value={phase}>
                {phase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.leadEmployeeId ?? "all"}
          onValueChange={(v) => onChange({ leadEmployeeId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Lead designer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All leads</SelectItem>
            {leadOptions.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {getEmployeeFullName(employee)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
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
        <p className="text-xs text-muted-foreground">
          Showing {resultCount} of {totalCount} project{totalCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
