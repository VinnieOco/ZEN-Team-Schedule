export function CrmLeadsContactsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-16 rounded-lg border bg-white p-3">
        <div className="h-10 rounded bg-slate-100" />
      </div>
      <div className="grid h-[calc(100dvh-18rem)] min-h-[20rem] gap-4 overflow-hidden lg:h-[calc(100dvh-14rem)] lg:grid-cols-[minmax(0,38%)_minmax(0,62%)]">
        <div className="h-full overflow-hidden rounded-xl border bg-white">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-slate-50 px-3 py-2.5">
              <div className="h-4 flex-1 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="hidden h-full overflow-hidden rounded-xl border bg-white lg:block">
          <div className="space-y-3 border-b px-5 py-4">
            <div className="h-6 w-1/2 rounded bg-slate-100" />
            <div className="h-4 w-1/3 rounded bg-slate-50" />
          </div>
          <div className="space-y-3 p-5">
            <div className="h-32 rounded-lg bg-slate-50" />
            <div className="h-28 rounded-lg bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
