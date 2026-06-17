"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, startOfMonth, startOfWeek } from "date-fns";

import { dayDeltaFromPixels, type GanttZoom } from "@/lib/gantt/timeline";

function snapRangeStart(date: Date, zoom: GanttZoom): Date {
  return zoom === "months"
    ? startOfMonth(date)
    : startOfWeek(date, { weekStartsOn: 1 });
}

export function useGanttTimelinePan({
  rangeStart,
  zoom,
  onRangeStartChange,
  disabled = false,
}: {
  rangeStart: Date;
  zoom: GanttZoom;
  onRangeStartChange: (date: Date) => void;
  disabled?: boolean;
}) {
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{
    startX: number;
    originRangeStart: Date;
    currentRangeStart: Date;
  } | null>(null);

  const onPanLayerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      event.preventDefault();
      panRef.current = {
        startX: event.clientX,
        originRangeStart: rangeStart,
        currentRangeStart: rangeStart,
      };
      setIsPanning(true);
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [disabled, rangeStart],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!panRef.current) return;
      const deltaPx = event.clientX - panRef.current.startX;
      const dayDelta = dayDeltaFromPixels(deltaPx, zoom);
      const next = addDays(panRef.current.originRangeStart, -dayDelta);
      panRef.current.currentRangeStart = next;
      onRangeStartChange(next);
    },
    [zoom, onRangeStartChange],
  );

  const finishPan = useCallback(() => {
    if (!panRef.current) return;
    const snapped = snapRangeStart(panRef.current.currentRangeStart, zoom);
    panRef.current = null;
    setIsPanning(false);
    onRangeStartChange(snapped);
  }, [zoom, onRangeStartChange]);

  const handlePointerUp = useCallback(() => {
    finishPan();
  }, [finishPan]);

  useEffect(() => {
    if (!isPanning) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isPanning, handlePointerMove, handlePointerUp]);

  return { onPanLayerPointerDown, isPanning };
}
