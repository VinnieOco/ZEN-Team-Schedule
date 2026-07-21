"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WeeklyTimesheet } from "@/components/time-tracking/weekly-timesheet";
import { useScheduling } from "@/context/scheduling-context";
import { formatWeekRange, getEmployeeFullName, getTimesheetSettings } from "@/lib/week";

export type TimesheetDialogMode = "log" | "edit";

interface TimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TimesheetDialogMode;
  /** Pre-select employee (dashboard). Required for edit mode. */
  employeeId?: string | null;
}

export function TimesheetDialog({
  open,
  onOpenChange,
  mode,
  employeeId,
}: TimesheetDialogProps) {
  const { getEmployeeById, selectedWeekStart, settings } = useScheduling();
  const employee = employeeId ? getEmployeeById(employeeId) : null;
  const isEdit = mode === "edit";
  const weekLabel = formatWeekRange(selectedWeekStart, getTimesheetSettings(settings));

  const title = isEdit
    ? employee
      ? `Edit timesheet — ${getEmployeeFullName(employee)}`
      : "Edit timesheet"
    : employee
      ? `Log time — ${getEmployeeFullName(employee)}`
      : "Log time";

  const description = isEdit
    ? `Week of ${weekLabel}. Change any line and save.`
    : `Week of ${weekLabel}. Add lines and hours, then save your timesheet.`;

  const showTimesheet = open && (!isEdit || Boolean(employeeId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,920px)] max-h-[92vh] max-w-[min(96vw,1100px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1100px)]">
        <div className="shrink-0 border-b px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          {showTimesheet ? (
            <WeeklyTimesheet
              fixedEmployeeId={employeeId ?? undefined}
              editMode={isEdit}
              embedded
              onSaved={() => onOpenChange(false)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a team member to edit.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use TimesheetDialog with mode="edit" */
export function WeeklyTimesheetDialog({
  open,
  onOpenChange,
  employeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}) {
  return (
    <TimesheetDialog open={open} onOpenChange={onOpenChange} mode="edit" employeeId={employeeId} />
  );
}
