"use client";

import { Cloud, Database } from "lucide-react";

import { useScheduling } from "@/context/scheduling-context";

export function DataSourceBanner() {
  const { dataSource, isLoading, error } = useScheduling();

  if (isLoading) {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800">
        Loading schedule data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (dataSource === "local") {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-xs text-slate-600">
        <Database className="h-3.5 w-3.5" />
        Local demo mode — data saved in your browser. Add Supabase env vars to sync to the cloud.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs text-emerald-800">
      <Cloud className="h-3.5 w-3.5" />
      Connected to Supabase
    </div>
  );
}
