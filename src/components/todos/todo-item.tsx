"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";

import { MentionText } from "@/components/todos/mention-text";
import { useScheduling } from "@/context/scheduling-context";
import { clientRouteKey, normalizeClientName } from "@/lib/clients";
import { cn } from "@/lib/utils";
import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggleCompleted: (id: string, completed: boolean) => void;
  showAssignee?: boolean;
}

function todoSourceLink(todo: Todo, projectLabel?: string, clientLabel?: string) {
  if (todo.source_project_id) {
    return {
      href: `/projects/${todo.source_project_id}`,
      label: projectLabel ? `Project: ${projectLabel}` : "View project",
    };
  }
  if (todo.source_client_key) {
    return {
      href: `/crm/${clientRouteKey(todo.source_client_key)}`,
      label: clientLabel ? `Client: ${clientLabel}` : "View client",
    };
  }
  return null;
}

export function TodoItem({ todo, onToggleCompleted, showAssignee = false }: TodoItemProps) {
  const { employees, projects, clients, getEmployeeById } = useScheduling();
  const employee = getEmployeeById(todo.employee_id);
  const project = todo.source_project_id
    ? projects.find((item) => item.id === todo.source_project_id)
    : undefined;
  const client = todo.source_client_key
    ? clients.find((item) => normalizeClientName(item.name) === todo.source_client_key)
    : undefined;
  const source = todoSourceLink(
    todo,
    project?.project_name,
    client?.name ?? todo.source_client_key ?? undefined,
  );
  const completed = todo.status === "completed";

  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5">
      <input
        type="checkbox"
        checked={completed}
        onChange={(event) => onToggleCompleted(todo.id, event.target.checked)}
        className={cn("mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500")}
        aria-label={completed ? "Mark to-do open" : "Mark to-do complete"}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <MentionText
          text={todo.body}
          className={`text-sm leading-relaxed ${completed ? "text-muted-foreground line-through" : "text-slate-900"}`}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {showAssignee && employee && <span>{employee.first_name} {employee.last_name}</span>}
          {todo.source_type === "mention" && <span>From @mention</span>}
          {source && (
            <Link href={source.href} className="font-medium text-emerald-700 hover:underline">
              {source.label}
            </Link>
          )}
          {completed && todo.completed_at && (
            <span>Completed {format(parseISO(todo.completed_at), "MMM d, yyyy")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
