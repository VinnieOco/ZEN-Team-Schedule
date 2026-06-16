export function GanttProgressLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
      <span className="font-medium text-slate-600">Progress</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-6 rounded-full bg-emerald-600" />
        Hours under 85%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-6 rounded-full bg-amber-500" />
        Hours 85–100%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-6 rounded-full bg-rose-600" />
        Over budget
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-6 rounded-full bg-amber-500" />
        Fee burn (when phase fee is set)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex h-3 w-8 flex-col overflow-hidden rounded border border-slate-200/80 bg-slate-50/50">
          <span className="h-1.5 border-b border-slate-100 bg-emerald-50" />
          <span className="h-1.5 bg-emerald-50" />
        </span>
        Staffing lane (one row per person)
      </span>
    </div>
  );
}
