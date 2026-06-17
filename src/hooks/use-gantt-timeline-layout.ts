"use client";

import { useEffect, useState, type RefObject } from "react";

import {
  columnWidthPx,
  timelineWidthPx,
  visibleColumnCount,
  type GanttZoom,
} from "@/lib/gantt/timeline";

/** Fit the Gantt timeline to the scroll container width (at least the default column count). */
export function useGanttTimelineLayout(
  containerRef: RefObject<HTMLElement | null>,
  zoom: GanttZoom,
  labelColumnWidth: number,
) {
  const minColumns = visibleColumnCount(zoom);
  const [columnCount, setColumnCount] = useState(minColumns);

  useEffect(() => {
    setColumnCount(minColumns);
  }, [minColumns]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const colWidth = columnWidthPx(zoom);
      const available = Math.max(el.clientWidth - labelColumnWidth, minColumns * colWidth);
      setColumnCount(Math.max(minColumns, Math.floor(available / colWidth)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, zoom, labelColumnWidth, minColumns]);

  const timelineWidth = timelineWidthPx(columnCount, zoom);
  return { columnCount, timelineWidth };
}
