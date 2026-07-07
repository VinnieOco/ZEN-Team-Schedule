"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { TodoItem } from "@/components/todos/todo-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import type { Employee } from "@/types";

interface MyTodosSectionProps {
  employee: Employee;
}

export function MyTodosSection({ employee }: MyTodosSectionProps) {
  const { todos, setTodoCompleted } = useScheduling();
  const [showCompleted, setShowCompleted] = useState(false);

  const myTodos = useMemo(
    () => todos.filter((todo) => todo.employee_id === employee.id),
    [employee.id, todos],
  );
  const openTodos = useMemo(
    () => myTodos.filter((todo) => todo.status === "open").slice(0, 5),
    [myTodos],
  );
  const completedTodos = useMemo(
    () =>
      myTodos
        .filter((todo) => todo.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? b.updated_at).getTime() -
            new Date(a.completed_at ?? a.updated_at).getTime(),
        )
        .slice(0, 5),
    [myTodos],
  );
  const openCount = myTodos.filter((todo) => todo.status === "open").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">My to-dos</CardTitle>
          <p className="text-sm text-muted-foreground">
            {openCount} open{employee.handle ? ` · tag you as @${employee.handle}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/todos">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {openTodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open to-dos. You will see items here when someone @mentions you in notes.
          </p>
        ) : (
          <div className="space-y-2">
            {openTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggleCompleted={setTodoCompleted} />
            ))}
          </div>
        )}

        {completedTodos.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowCompleted((open) => !open)}
            >
              {showCompleted ? "Hide completed" : `Show recent completed (${completedTodos.length})`}
            </Button>
            {showCompleted && (
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} onToggleCompleted={setTodoCompleted} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
