"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ClientsTable } from "@/components/crm/clients-table";
import { CrmLeadsContactsTable } from "@/components/crm/crm-leads-contacts-table";
import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";

type CrmTab = "clients" | "leads";

const CRM_TABS: { id: CrmTab; label: string }[] = [
  { id: "clients", label: "Clients" },
  { id: "leads", label: "Lead Contacts" },
];

function parseTab(value: string | null): CrmTab {
  return value === "leads" ? "leads" : "clients";
}

const UNDERLINE_TAB =
  "rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none";

export function CrmPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);

  const setTab = useCallback(
    (tab: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (tab === "clients") next.delete("tab");
      else next.set("tab", tab);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={setTab} className="min-w-0">
      <div className="border-b border-slate-200">
        <ScrollableTabsList className="h-auto rounded-none border-0 bg-transparent p-0 shadow-none">
          {CRM_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className={UNDERLINE_TAB}>
              {tab.label}
            </TabsTrigger>
          ))}
        </ScrollableTabsList>
      </div>

      <TabsContent value="clients" className="mt-5 min-w-0">
        <ClientsTable />
      </TabsContent>
      <TabsContent value="leads" className="mt-5 min-w-0">
        <CrmLeadsContactsTable />
      </TabsContent>
    </Tabs>
  );
}
