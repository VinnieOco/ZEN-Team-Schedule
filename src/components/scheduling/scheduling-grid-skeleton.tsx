export function SchedulingGridSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-lg border bg-white p-4">
      <div className="h-10 rounded bg-slate-100" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-16 w-48 shrink-0 rounded bg-slate-100" />
          <div className="grid flex-1 grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-16 rounded bg-slate-50" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
