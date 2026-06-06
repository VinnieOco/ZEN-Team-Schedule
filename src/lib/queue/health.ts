import { differenceInDays, parseISO } from "date-fns";

import type { QueueHealth } from "@/lib/queue/types";

export function deriveQueueHealth(
  dueDate: string | undefined,
  hoursUsed: number,
  budgetHours: number,
  hasLead: boolean,
): QueueHealth {
  if (!hasLead && budgetHours > 0) return "blocked";

  if (budgetHours > 0 && hoursUsed > budgetHours) return "at_risk";

  if (dueDate?.trim()) {
    try {
      const days = differenceInDays(parseISO(dueDate), new Date());
      if (days < 0) return "overdue";
      if (days <= 7 && budgetHours > 0 && hoursUsed / budgetHours >= 0.75) return "at_risk";
    } catch {
      // ignore parse errors
    }
  }

  return "on_track";
}

export function healthLabel(health: QueueHealth): string {
  switch (health) {
    case "on_track":
      return "On track";
    case "at_risk":
      return "At risk";
    case "overdue":
      return "Overdue";
    case "blocked":
      return "Blocked";
  }
}
