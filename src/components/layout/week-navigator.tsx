"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScheduling } from "@/context/scheduling-context";

interface WeekNavigatorProps {
  /** `toolbar` = grouped control for page headers; `outline` = matches outline action buttons */
  variant?: "toolbar" | "outline";
  className?: string;
}

/** Previous / Today / Next controls for the shared schedule week. */
export function WeekNavigator({ variant = "toolbar", className }: WeekNavigatorProps) {
  const { goToPreviousWeek, goToNextWeek, goToToday } = useScheduling();

  if (variant === "outline") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToPreviousWeek}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToNextWeek}
          aria-label="Next week"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-lg border bg-white p-0.5 shadow-sm",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPreviousWeek}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={goToToday}
      >
        Today
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextWeek}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
