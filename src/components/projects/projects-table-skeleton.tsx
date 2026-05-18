export function ProjectsTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-14 rounded-lg border bg-slate-100" />
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="h-11 border-b bg-slate-50" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b px-4 py-4 last:border-b-0">
            <div className="h-4 flex-1 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-50" />
            <div className="h-4 w-20 rounded bg-slate-50" />
            <div className="h-4 w-16 rounded bg-slate-50" />
          </div>
        ))}
      </div>
    </div>
  );
}
