import type { Employee, Todo, TodoNoteSourceType } from "@/types";

export interface MentionTodoContext {
  noteId: string;
  noteType: TodoNoteSourceType;
  body: string;
  mentionedEmployees: Employee[];
  projectId?: string;
  clientKey?: string;
  createdBy?: string | null;
  now?: string;
}

function isMentionTodoForNote(todo: Todo, noteId: string, noteType: TodoNoteSourceType): boolean {
  return (
    todo.source_type === "mention" &&
    todo.source_note_id === noteId &&
    todo.source_note_type === noteType
  );
}

export function mentionTodoKey(todo: Pick<Todo, "employee_id" | "source_note_id" | "source_note_type" | "source_type">): string | null {
  if (todo.source_type !== "mention" || !todo.source_note_id || !todo.source_note_type) {
    return null;
  }
  return `${todo.employee_id}:${todo.source_note_id}:${todo.source_note_type}`;
}

export function isSameMentionTodo(a: Todo, b: Todo): boolean {
  const keyA = mentionTodoKey(a);
  const keyB = mentionTodoKey(b);
  return keyA !== null && keyA === keyB;
}

export function syncMentionTodos(existingTodos: Todo[], context: MentionTodoContext): Todo[] {
  const now = context.now ?? new Date().toISOString();
  const trimmedBody = context.body.trim();
  const mentionedIds = new Set(context.mentionedEmployees.map((employee) => employee.id));

  const withoutStaleMentions = existingTodos.filter((todo) => {
    if (!isMentionTodoForNote(todo, context.noteId, context.noteType)) return true;
    return mentionedIds.has(todo.employee_id);
  });

  let next = withoutStaleMentions.map((todo) => {
    if (!isMentionTodoForNote(todo, context.noteId, context.noteType)) return todo;
    if (todo.body === trimmedBody) return todo;
    return { ...todo, body: trimmedBody, updated_at: now };
  });

  for (const employee of context.mentionedEmployees) {
    const existing = next.find(
      (todo) =>
        isMentionTodoForNote(todo, context.noteId, context.noteType) &&
        todo.employee_id === employee.id,
    );
    if (existing) continue;

    next.push({
      id: crypto.randomUUID(),
      employee_id: employee.id,
      body: trimmedBody,
      status: "open",
      completed_at: null,
      created_by: context.createdBy ?? null,
      source_type: "mention",
      source_project_id: context.projectId ?? null,
      source_client_key: context.clientKey ?? null,
      source_note_id: context.noteId,
      source_note_type: context.noteType,
      created_at: now,
      updated_at: now,
    });
  }

  return next.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function removeMentionTodosForNote(
  existingTodos: Todo[],
  noteId: string,
  noteType: TodoNoteSourceType,
): Todo[] {
  return existingTodos.filter((todo) => !isMentionTodoForNote(todo, noteId, noteType));
}
