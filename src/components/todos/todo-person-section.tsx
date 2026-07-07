"use client";

import { useMemo, useState } from "react";

import { TodoItem } from "@/components/todos/todo-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployeeHandleLabel } from "@/lib/todos/handles";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee, Todo } from "@/types";

interface TodoPersonSectionProps {
  employee: Employee;
  todos: Todo[];
  canToggle: boolean;
  onToggleCompleted: (id: string, completed: boolean) => void;
}

export function TodoPersonSection({
  employee,
  todos,
  canToggle,
  onToggleCompleted,
}: TodoPersonSectionProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const openTodos = useMemo(
    () => todos.filter((todo) => todo.status === "open"),
    [todos],
  );
  const completedTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? b.updated_at).getTime() -
            new Date(a.completed_at ?? a.updated_at).getTime(),
        ),
    [todos],
  );

  const handleLabel = getEmployeeHandleLabel(employee);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {getEmployeeFullName(employee)}
          {handleLabel && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">{handleLabel}</span>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {openTodos.length} open
          {completedTodos.length > 0 ? ` · ${completedTodos.length} completed` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {openTodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open to-dos.</p>
        ) : (
          <div className="space-y-2">
            {openTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggleCompleted={canToggle ? onToggleCompleted : () => {}}
              />
            ))}
          </div>
        )}

        {completedTodos.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowCompleted((open) => !open)}
            >
              {showCompleted ? "Hide completed" : `Show completed (${completedTodos.length})`}
            </Button>
            {showCompleted && (
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggleCompleted={canToggle ? onToggleCompleted : () => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
