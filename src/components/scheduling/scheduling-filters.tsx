"use client";

import Link from "next/link";
import { Search, Settings, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { departmentFilterLabel, listDepartmentsFromEmployees } from "@/lib/departments";

export function SchedulingFilters() {
  const { employees, projects, categories, filters, setFilters, clearFilters } = useScheduling();

  const departments = listDepartmentsFromEmployees(employees);

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.department) ||
    Boolean(filters.projectId) ||
    Boolean(filters.categoryId);

  return (
    <div className="space-y-3 rounded-lg border bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.department ?? "all"}
          onValueChange={(v) => setFilters({ department: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {departmentFilterLabel(dept)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-[min(100%,240px)] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search team members..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
        <Select
          value={filters.projectId ?? "all"}
          onValueChange={(v) => setFilters({ projectId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects
              .filter((p) => p.active)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(v) => setFilters({ categoryId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
