"use client";

import { useMemo } from "react";

import { AddTodoForm } from "@/components/todos/add-todo-form";
import { TodoPersonSection } from "@/components/todos/todo-person-section";
import { AppPage } from "@/components/layout/app-page";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { getEmployeeFullName } from "@/lib/week";

export function TodosPageClient() {
  const { employees, todos, isLoading, addTodo, setTodoCompleted, deleteTodo } = useScheduling();
  const { permissions, linkedEmployeeId } = usePermissions();

  const visibleEmployees = useMemo(() => {
    const active = employees
      .filter((employee) => employee.active)
      .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)));

    if (permissions.viewAllTodos) return active;
    if (!linkedEmployeeId) return [];
    return active.filter((employee) => employee.id === linkedEmployeeId);
  }, [employees, linkedEmployeeId, permissions.viewAllTodos]);

  const todosByEmployee = useMemo(() => {
    const map = new Map<string, typeof todos>();
    for (const employee of visibleEmployees) {
      map.set(
        employee.id,
        todos.filter((todo) => todo.employee_id === employee.id),
      );
    }
    return map;
  }, [todos, visibleEmployees]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading to-dos…</p>;
  }

  return (
    <AppPage className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">To-dos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {permissions.viewAllTodos
            ? "Open and completed to-dos by team member. Tag someone with @handle in notes to add items automatically."
            : "Your open and completed to-dos from @mentions and manual entries."}
        </p>
      </div>

      {!linkedEmployeeId && !permissions.viewAllTodos && (
        <EmptyState
          title="Link your schedule profile"
          description="Connect your login to your team member record in Settings to see your to-dos."
        />
      )}

      {permissions.viewTodos && (permissions.viewAllTodos || linkedEmployeeId) && (
        <AddTodoForm
          defaultEmployeeId={linkedEmployeeId}
          allowAssigneePicker
          onAddTodo={addTodo}
        />
      )}

      {visibleEmployees.length === 0 ? (
        <EmptyState title="No team members to show" description="Active team members will appear here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleEmployees.map((employee) => (
            <TodoPersonSection
              key={employee.id}
              employee={employee}
              todos={todosByEmployee.get(employee.id) ?? []}
              canToggle={
                permissions.viewAllTodos || employee.id === linkedEmployeeId
              }
              canDelete={
                permissions.viewAllTodos || employee.id === linkedEmployeeId
              }
              onToggleCompleted={setTodoCompleted}
              onDelete={deleteTodo}
            />
          ))}
        </div>
      )}
    </AppPage>
  );
}
