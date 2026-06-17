"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

import {
  columnWidthPx,
  timelineWidthPx,
  visibleColumnCount,
  type GanttZoom,
} from "@/lib/gantt/timeline";

function computeColumnCount(
  clientWidth: number,
  zoom: GanttZoom,
  labelColumnWidth: number,
  minColumns: number,
): number {
  if (clientWidth <= 0) return minColumns;

  const colWidth = columnWidthPx(zoom);
  const timelineArea = clientWidth - labelColumnWidth;
  if (timelineArea <= 0) return minColumns;

  return Math.max(minColumns, Math.ceil(timelineArea / colWidth));
}

/** Fit the Gantt timeline to the scroll container width (at least the default column count). */
export function useGanttTimelineLayout(
  containerRef: RefObject<HTMLElement | null>,
  zoom: GanttZoom,
  labelColumnWidth: number,
  /** When false, skip measuring (e.g. timeline tab hidden). Keeps the last good width. */
  enabled = true,
) {
  const minColumns = visibleColumnCount(zoom);
  const [columnCount, setColumnCount] = useState(minColumns);

  const measure = useCallback(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth;
    if (width === 0) return;

    setColumnCount(computeColumnCount(width, zoom, labelColumnWidth, minColumns));
  }, [containerRef, enabled, zoom, labelColumnWidth, minColumns]);

  useEffect(() => {
    setColumnCount(minColumns);
  }, [minColumns]);

  useLayoutEffect(() => {
    if (!enabled) return;
    measure();
  }, [enabled, measure]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let raf1 = 0;
    let raf2 = 0;
    let observer: ResizeObserver | null = null;

    const attach = () => {
      const el = containerRef.current;
      if (!el || disposed) return false;

      measure();
      observer = new ResizeObserver(measure);
      observer.observe(el);
      return true;
    };

    if (!attach()) {
      raf1 = requestAnimationFrame(() => {
        if (!attach()) {
          raf2 = requestAnimationFrame(attach);
        }
      });
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer?.disconnect();
    };
  }, [enabled, measure, containerRef]);

  const timelineWidth = timelineWidthPx(columnCount, zoom);
  return { columnCount, timelineWidth };
}
