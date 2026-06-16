import * as React from "react";

import { cn } from "@/lib/utils";

const DateInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "date", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-8 w-[10.5rem] shrink-0 rounded-md border border-input bg-white px-2.5 py-1 text-sm tabular-nums shadow-sm",
        "transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[color-scheme:light]",
        "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50",
        "hover:[&::-webkit-calendar-picker-indicator]:opacity-80",
        className,
      )}
      {...props}
    />
  ),
);
DateInput.displayName = "DateInput";

export { DateInput };
