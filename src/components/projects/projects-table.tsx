"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";

import { ProjectDetailPane } from "@/components/projects/project-detail-pane";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectListPane } from "@/components/projects/project-list-pane";
import { ProjectMergeDialog } from "@/components/projects/project-merge-dialog";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsTableSkeleton } from "@/components/projects/projects-table-skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { getParentProject, isChangeOrder } from "@/lib/change-orders";
import {
  defaultProjectFilters,
  filterProjects,
  type ProjectFilters,
} from "@/lib/filter-projects";
import {
  buildProjectClientHierarchy,
  flattenHierarchyProjectIds,
} from "@/lib/projects/list-hierarchy";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export function ProjectsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    projects,
    estimates,
    employees,
    timeEntries,
    getEmployeeById,
    isLoading,
    deleteChangeOrder,
  } = useScheduling();
  const { permissions } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(defaultProjectFilters);

  const selectedId = searchParams.get("project");

  const setSelectedId = useCallback(
    (projectId: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (projectId) next.set("project", projectId);
      else next.delete("project");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const visibleProjects = useMemo(
    () => filterProjects(projects, filters, getEmployeeById),
    [projects, filters, getEmployeeById],
  );

  const hierarchy = useMemo(
    () => buildProjectClientHierarchy(visibleProjects),
    [visibleProjects],
  );

  const selectableIds = useMemo(
    () => flattenHierarchyProjectIds(hierarchy),
    [hierarchy],
  );

  const selectedProject = useMemo(
    () => (selectedId ? (projects.find((p) => p.id === selectedId) ?? null) : null),
    [projects, selectedId],
  );

  // Drop stale or filtered-out selection from the URL.
  useEffect(() => {
    if (!selectedId) return;
    if (selectableIds.includes(selectedId)) return;
    setSelectedId(null);
  }, [selectedId, selectableIds, setSelectedId]);

  const totalCount = useMemo(
    () =>
      projects.filter((p) => {
        if (!filters.showInactive && !p.active) return false;
        if (!filters.showChangeOrders && isChangeOrder(p)) return false;
        return true;
      }).length,
    [projects, filters.showInactive, filters.showChangeOrders],
  );

  const updateFilters = (partial: Partial<ProjectFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const openCreate = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const isDesktopSplit = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const handleSelect = (projectId: string) => {
    // Mobile: open the full project page. Desktop: select in the detail panel.
    if (!isDesktopSplit()) {
      router.push(`/projects/${projectId}`);
      return;
    }
    setSelectedId(projectId);
  };

  const handleDeleteChangeOrder = () => {
    if (!selectedProject || !isChangeOrder(selectedProject)) return;
    if (
      !window.confirm(
        `Delete change order “${selectedProject.project_name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    const parent = getParentProject(projects, selectedProject);
    const result = deleteChangeOrder(selectedProject.id);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    if (parent) {
      setSelectedId(parent.id);
    } else {
      setSelectedId(null);
    }
  };

  if (isLoading) {
    return <ProjectsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {permissions.editProjects && (
        <div className="flex justify-stretch sm:justify-end">
          <Button type="button" className="w-full sm:w-auto" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}

      <ProjectsFilters
        filters={filters}
        onChange={updateFilters}
        onClear={() => setFilters(defaultProjectFilters())}
        resultCount={visibleProjects.length}
        totalCount={totalCount}
      />

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects match your filters"
          description="Try a different search term or clear filters to see more projects."
          actionLabel="Clear filters"
          onAction={() => setFilters(defaultProjectFilters())}
        />
      ) : (
        <div
          className={cn(
            "grid h-[calc(100dvh-18rem)] min-h-[20rem] gap-4 overflow-hidden lg:h-[calc(100dvh-14rem)]",
            "lg:grid-cols-[minmax(0,38%)_minmax(0,62%)]",
          )}
        >
          <div className="h-full min-h-0 overflow-hidden">
            <ProjectListPane
              groups={hierarchy}
              selectedId={
                selectedId && selectableIds.includes(selectedId) ? selectedId : null
              }
              onSelect={handleSelect}
              selectableIds={selectableIds}
            />
          </div>

          <div className="hidden h-full min-h-0 overflow-hidden lg:block">
            <ProjectDetailPane
              project={
                selectedProject && selectableIds.includes(selectedProject.id)
                  ? selectedProject
                  : null
              }
              projects={projects}
              estimates={estimates}
              timeEntries={timeEntries}
              employees={employees}
              getEmployeeById={getEmployeeById}
              canEdit={permissions.editProjects}
              onEdit={() => selectedProject && openEdit(selectedProject)}
              onDeleteChangeOrder={handleDeleteChangeOrder}
              onMerge={
                permissions.editProjects && selectedProject
                  ? () => setMergeDialogOpen(true)
                  : undefined
              }
              onSelectProject={handleSelect}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        On desktop, select a project to review overview details here. On mobile, tapping a job
        opens the full project page. Parent totals include change orders when COs exist.
      </p>

      {permissions.editProjects && (
        <ProjectFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={editingProject}
        />
      )}

      {permissions.editProjects && selectedProject && (
        <ProjectMergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          source={selectedProject}
          onMerged={(targetId) => setSelectedId(targetId)}
        />
      )}
    </div>
  );
}
