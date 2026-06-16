"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { Diamond } from "lucide-react";

interface GanttTimelineContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  date: string;
  onClose: () => void;
  onAddMilestone: () => void;
}

function formatMilestoneDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function GanttTimelineContextMenu({
  open,
  x,
  y,
  date,
  onClose,
  onAddMilestone,
}: GanttTimelineContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const handleScroll = () => onClose();

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[12rem] overflow-hidden rounded-md border border-slate-200 bg-white p-1 shadow-md"
      style={{ left: x, top: y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100"
        onClick={() => {
          onAddMilestone();
          onClose();
        }}
      >
        <Diamond className="h-4 w-4 text-slate-500" />
        <span>
          Add milestone
          <span className="block text-xs text-muted-foreground">{formatMilestoneDate(date)}</span>
        </span>
      </button>
    </div>,
    document.body,
  );
}
