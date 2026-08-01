export function ProjectsTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-full rounded-lg bg-slate-100 sm:ml-auto sm:w-36" />
      <div className="space-y-3 rounded-lg border bg-white p-3">
        <div className="h-10 rounded bg-slate-100" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-10 rounded bg-slate-50" />
          <div className="h-10 rounded bg-slate-50" />
          <div className="h-10 rounded bg-slate-50 sm:col-span-2 lg:col-span-1" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white md:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 border-b px-3 py-3 last:border-b-0">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-1/2 rounded bg-slate-50" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-3 rounded bg-slate-50" />
              <div className="h-3 rounded bg-slate-50" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-lg border bg-white md:block">
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
