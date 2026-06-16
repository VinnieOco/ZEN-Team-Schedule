"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const ganttTooltipContentClassName =
  "z-50 max-w-[240px] rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md";

interface GanttTooltipProviderProps {
  children: ReactNode;
}

export function GanttTooltipProvider({ children }: GanttTooltipProviderProps) {
  return (
    <Tooltip.Provider delayDuration={150}>
      {children}
    </Tooltip.Provider>
  );
}

interface GanttTooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom";
}

export function GanttTooltip({
  children,
  content,
  side = "top",
}: GanttTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className={ganttTooltipContentClassName}
        >
          {content}
          <Tooltip.Arrow className="fill-white" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
