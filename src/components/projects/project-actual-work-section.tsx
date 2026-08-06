"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import { formatProjectHours } from "@/lib/project-format";
import {
  buildPersonDayActualHours,
  buildProjectPersonActualHours,
  type ProjectPersonActualHours,
} from "@/lib/projects/actual-work";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee, TimeEntry } from "@/types";

interface ProjectActualWorkSectionProps {
  projectId: string;
  timeEntries: TimeEntry[];
  employees: Employee[];
}

export function ProjectActualWorkSection({
  projectId,
  timeEntries,
  employees,
}: ProjectActualWorkSectionProps) {
  const { getCategoryById } = useScheduling();
  const [selected, setSelected] = useState<ProjectPersonActualHours | null>(null);

  const people = useMemo(
    () => buildProjectPersonActualHours(timeEntries, projectId),
    [timeEntries, projectId],
  );

  const selectedEmployee = selected
    ? employees.find((e) => e.id === selected.employeeId)
    : undefined;
  const dayBreakdown = selected ? buildPersonDayActualHours(selected.entries) : [];

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base">
            Actual work ({people.length} {people.length === 1 ? "person" : "people"})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {people.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-0 sm:pb-0">
              No timesheet hours logged on this project yet.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {people.map((row) => {
                  const emp = employees.find((e) => e.id === row.employeeId);
                  return (
                    <li
                      key={row.employeeId}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {emp ? getEmployeeFullName(emp) : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.entryCount} entr{row.entryCount === 1 ? "y" : "ies"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 hover:underline"
                        onClick={() => setSelected(row)}
                      >
                        {formatProjectHours(row.totalHours)}h
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team member</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Total hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.map((row) => {
                      const emp = employees.find((e) => e.id === row.employeeId);
                      return (
                        <TableRow key={row.employeeId}>
                          <TableCell className="font-medium">
                            {emp ? getEmployeeFullName(emp) : "Unknown"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.entryCount}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              className="font-semibold tabular-nums text-emerald-700 hover:underline"
                              onClick={() => setSelected(row)}
                            >
                              {formatProjectHours(row.totalHours)}h
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle>
              {selectedEmployee ? getEmployeeFullName(selectedEmployee) : "Team member"}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${formatProjectHours(selected.totalHours)}h logged across ${dayBreakdown.length} day${dayBreakdown.length === 1 ? "" : "s"}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {dayBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No day details.</p>
            ) : (
              <ul className="space-y-3">
                {dayBreakdown.map((day) => (
                  <li
                    key={day.date}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900">
                        {format(parseISO(day.date), "EEE, MMM d, yyyy")}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatProjectHours(day.hours)}h
                      </p>
                    </div>
                    {day.entries.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {day.entries.map((entry) => {
                          const cat = getCategoryById(entry.allocation_category_id);
                          const detail = [
                            cat?.name,
                            entry.task_name?.trim() || null,
                            entry.notes?.trim() || null,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <li
                              key={entry.id}
                              className="flex items-start justify-between gap-3 text-xs text-muted-foreground"
                            >
                              <span className="min-w-0 truncate">
                                {detail || "Time entry"}
                              </span>
                              <span className="shrink-0 tabular-nums font-medium text-slate-700">
                                {formatProjectHours(entry.hours)}h
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
