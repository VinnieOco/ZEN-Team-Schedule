"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScheduling } from "@/context/scheduling-context";

interface WeekNavigatorProps {
  /** @deprecated Both variants use the same outline button style. */
  variant?: "toolbar" | "outline";
  className?: string;
}

/** Previous / Today / Next controls for the shared schedule week. */
export function WeekNavigator({ className }: WeekNavigatorProps) {
  const { goToPreviousWeek, goToNextWeek, goToToday } = useScheduling();

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={goToPreviousWeek}
        aria-label="Previous week"
      >
        <ChevronLeft />
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={goToToday}>
        Today
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={goToNextWeek}
        aria-label="Next week"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
