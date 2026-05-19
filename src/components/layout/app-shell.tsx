"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ZenLogo } from "@/components/layout/zen-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <div className="hidden lg:flex print:hidden">
        <AppSidebar />
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out lg:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3 text-white hover:bg-slate-800"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-4 lg:hidden print:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ZenLogo size={32} />
            <span className="text-sm font-semibold text-slate-900">ZEN Team Scheduling</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overscroll-y-contain">{children}</main>
      </div>
    </div>
  );
}
