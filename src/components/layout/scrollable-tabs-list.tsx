"use client";

import type { ComponentPropsWithoutRef } from "react";

import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ScrollableTabsListProps = ComponentPropsWithoutRef<typeof TabsList>;

/** Tab bar that scrolls horizontally on mobile instead of wrapping or overflowing the page. */
export function ScrollableTabsList({ className, children, ...props }: ScrollableTabsListProps) {
  return (
    <div className="scroll-tabs -mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <TabsList
        className={cn(
          "inline-flex h-10 w-max min-w-0 flex-nowrap justify-start gap-0.5",
          className,
        )}
        {...props}
      >
        {children}
      </TabsList>
    </div>
  );
}
