"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import { getEmployeeHandleLabel } from "@/lib/todos/handles";
import { getEmployeeFullName } from "@/lib/week";

interface AddTodoFormProps {
  defaultEmployeeId?: string | null;
  allowAssigneePicker?: boolean;
  onAddTodo: (employeeId: string, body: string) => void;
}

export function AddTodoForm({
  defaultEmployeeId,
  allowAssigneePicker = true,
  onAddTodo,
}: AddTodoFormProps) {
  const { employees } = useScheduling();
  const [assigneeId, setAssigneeId] = useState(defaultEmployeeId ?? "");
  const [body, setBody] = useState("");

  const assigneeOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.active)
        .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)))
        .map((employee) => ({
          value: employee.id,
          label: getEmployeeFullName(employee),
          keywords: [employee.handle, employee.email, employee.department]
            .filter(Boolean)
            .join(" "),
        })),
    [employees],
  );

  const effectiveAssigneeId =
    assigneeId || defaultEmployeeId || assigneeOptions[0]?.value || "";

  const handleAdd = () => {
    const trimmed = body.trim();
    if (!trimmed || !effectiveAssigneeId) return;
    onAddTodo(effectiveAssigneeId, trimmed);
    setBody("");
  };

  const selectedEmployee = employees.find((employee) => employee.id === effectiveAssigneeId);
  const handleHint = selectedEmployee ? getEmployeeHandleLabel(selectedEmployee) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add to-do</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowAssigneePicker ? (
          <div className="space-y-2">
            <Label htmlFor="todo-assignee">Assign to</Label>
            <SearchableSelect
              id="todo-assignee"
              options={assigneeOptions}
              value={effectiveAssigneeId}
              onValueChange={setAssigneeId}
              placeholder="Select team member"
              searchPlaceholder="Search team members…"
              emptyMessage="No team members found."
            />
          </div>
        ) : (
          selectedEmployee && (
            <p className="text-sm text-muted-foreground">
              Assigning to {getEmployeeFullName(selectedEmployee)}
              {handleHint ? ` (${handleHint})` : ""}
            </p>
          )
        )}

        <div className="space-y-2">
          <Label htmlFor="todo-body">To-do</Label>
          <Textarea
            id="todo-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What needs to be done? Use @handle to copy this to other teammates."
            rows={3}
          />
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={!body.trim() || !effectiveAssigneeId}
        >
          Add to-do
        </Button>
      </CardContent>
    </Card>
  );
}
