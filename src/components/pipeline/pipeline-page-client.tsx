"use client";

import { useCallback } from "react";

import { ScrollableTabsList } from "@/components/layout/scrollable-tabs-list";
import { PipelineConstructionTab } from "@/components/pipeline/pipeline-construction-tab";
import { PipelineDesignTab } from "@/components/pipeline/pipeline-design-tab";
import { PipelineEstimatingTab } from "@/components/pipeline/pipeline-estimating-tab";
import { PipelineLeadsTab } from "@/components/pipeline/pipeline-leads-tab";
import { PipelineOverviewTab } from "@/components/pipeline/pipeline-overview-tab";
import { PipelineWipTab } from "@/components/pipeline/pipeline-wip-tab";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { useOptimisticUrlTab } from "@/hooks/use-optimistic-url-tab";
import { usePermissions } from "@/hooks/use-permissions";
import { PIPELINE_TABS, type PipelineTab } from "@/lib/pipeline/types";

function parseTab(value: string | null): PipelineTab {
  if (
    value === "leads" ||
    value === "design" ||
    value === "estimating" ||
    value === "construction" ||
    value === "wip"
  ) {
    return value;
  }
  return "overview";
}

const UNDERLINE_TAB =
  "rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-800 data-[state=active]:shadow-none";

export function PipelinePageClient() {
  const { permissions } = usePermissions();
  const visibleTabs = PIPELINE_TABS.filter(
    (tab) => tab.id !== "wip" || permissions.viewWipSchedule,
  );

  const applyTab = useCallback((tab: PipelineTab, params: URLSearchParams, previous: PipelineTab) => {
    if (tab === "overview") {
      params.delete("tab");
      params.delete("view");
      params.delete("focus");
    } else {
      params.set("tab", tab);
      // Sub-view / list focus are per tab, so drop them whenever the tab itself changes.
      if (tab !== previous) {
        params.delete("view");
        params.delete("focus");
      }
    }
  }, []);

  const [activeTab, setTab] = useOptimisticUrlTab(parseTab, applyTab);
  const resolvedTab =
    activeTab === "wip" && !permissions.viewWipSchedule ? "overview" : activeTab;

  return (
    <Tabs value={resolvedTab} onValueChange={setTab} className="min-w-0">
      <div className="border-b border-slate-200">
        <ScrollableTabsList className="h-auto rounded-none border-0 bg-transparent p-0 shadow-none">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className={UNDERLINE_TAB}>
              {tab.label}
            </TabsTrigger>
          ))}
        </ScrollableTabsList>
      </div>

      <TabsContent value="overview" className="mt-5 min-w-0">
        <PipelineOverviewTab />
      </TabsContent>
      <TabsContent value="leads" className="mt-5 min-w-0">
        <PipelineLeadsTab />
      </TabsContent>
      <TabsContent value="design" className="mt-5 min-w-0">
        <PipelineDesignTab />
      </TabsContent>
      <TabsContent value="estimating" className="mt-5 min-w-0">
        <PipelineEstimatingTab />
      </TabsContent>
      <TabsContent value="construction" className="mt-5 min-w-0">
        <PipelineConstructionTab />
      </TabsContent>
      {permissions.viewWipSchedule ? (
        <TabsContent value="wip" className="mt-5 min-w-0">
          <PipelineWipTab />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
