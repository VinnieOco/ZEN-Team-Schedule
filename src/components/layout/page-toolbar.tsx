import { cn } from "@/lib/utils";

interface PageToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/** Horizontally scrollable row of controls (week nav, filters, actions) on narrow screens. */
export function PageToolbar({ children, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "page-toolbar-scroll flex w-full max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1",
        className,
      )}
    >
      {children}
    </div>
  );
}
