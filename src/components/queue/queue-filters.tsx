"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import {
  defaultQueueFilters,
  queueFiltersActive,
  QUEUE_HEALTH_OPTIONS,
  QUEUE_SORT_OPTIONS,
} from "@/lib/filter-queue";
import { departmentFilterLabel, UNASSIGNED_DEPARTMENT } from "@/lib/departments";
import { getDepartmentOptions } from "@/lib/team-options";
import type { QueueFilters, QueueKind } from "@/lib/queue/types";

interface QueueFiltersBarProps {
  kind: QueueKind;
  filters: QueueFilters;
  onChange: (partial: Partial<QueueFilters>) => void;
  resultCount: number;
  totalCount: number;
}

export function QueueFiltersBar({
  kind,
  filters,
  onChange,
  resultCount,
  totalCount,
}: QueueFiltersBarProps) {
  const { employees, settings, projects } = useScheduling();
  const hasActive = queueFiltersActive(filters);

  const departmentOptions = useMemo(
    () =>
      [
        ...new Set([
          ...getDepartmentOptions(settings, employees).filter((d) => d !== UNASSIGNED_DEPARTMENT),
          ...(projects.map((p) => p.department?.trim()).filter(Boolean) as string[]),
        ]),
      ].sort((a, b) => a.localeCompare(b)),
    [settings, employees, projects],
  );

  const departmentFilterOptions = useMemo(
    () => [
      { value: "all", label: "All departments" },
      ...departmentOptions.map((dept) => ({ value: dept, label: dept })),
      { value: UNASSIGNED_DEPARTMENT, label: departmentFilterLabel(UNASSIGNED_DEPARTMENT) },
    ],
    [departmentOptions],
  );

  return (
    <div className="min-w-0 space-y-3 rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="relative min-w-[min(100%,240px)] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={
              kind === "design"
                ? "Search project, client, or lead designer…"
                : "Search project, client, or lead estimator…"
            }
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
          className="w-full sm:w-[180px]"
        />
        <SearchableSelect
          options={QUEUE_SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={filters.sortBy}
          onValueChange={(v) => onChange({ sortBy: v as QueueFilters["sortBy"] })}
          placeholder="Sort by"
          searchPlaceholder="Sort by…"
          className="w-full sm:w-[150px]"
        />
        <SearchableSelect
          options={QUEUE_HEALTH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={filters.health}
          onValueChange={(v) => onChange({ health: v as QueueFilters["health"] })}
          placeholder="Health"
          searchPlaceholder="Filter health…"
          className="w-full sm:w-[160px]"
        />
        {hasActive && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(defaultQueueFilters())}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Switch
            id="queue-show-inactive"
            checked={filters.showInactive}
            onCheckedChange={(showInactive) => onChange({ showInactive })}
          />
          <Label htmlFor="queue-show-inactive" className="text-sm font-normal">
            Include inactive projects
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {resultCount} of {totalCount}
        </p>
      </div>
    </div>
  );
}
