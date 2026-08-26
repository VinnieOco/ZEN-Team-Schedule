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
      <div className="grid h-[calc(100dvh-18rem)] min-h-[20rem] gap-4 overflow-hidden lg:h-[calc(100dvh-14rem)] lg:grid-cols-[minmax(0,38%)_minmax(0,62%)]">
        <div className="h-full overflow-hidden rounded-xl border bg-white">
          {Array.from({ length: 3 }, (_, group) => (
            <div key={group} className="border-b last:border-b-0">
              <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2.5">
                <div className="h-3.5 w-3.5 rounded bg-slate-100" />
                <div className="h-4 flex-1 rounded bg-slate-100" />
                <div className="h-5 w-8 rounded-full bg-slate-100" />
              </div>
              {Array.from({ length: 3 }, (_, row) => (
                <div key={row} className="space-y-1.5 border-t border-slate-50 px-3 py-2.5">
                  <div className="h-4 w-3/4 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-50" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="hidden h-full overflow-hidden rounded-xl border bg-white lg:block">
          <div className="space-y-3 border-b px-5 py-4">
            <div className="h-6 w-1/2 rounded bg-slate-100" />
            <div className="h-4 w-1/3 rounded bg-slate-50" />
          </div>
          <div className="grid grid-cols-4 gap-3 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-20 rounded-lg bg-slate-50" />
            ))}
          </div>
          <div className="space-y-3 px-5 pb-5">
            <div className="h-40 rounded-lg bg-slate-50" />
            <div className="h-28 rounded-lg bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
