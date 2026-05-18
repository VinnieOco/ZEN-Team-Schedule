"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import type { Project } from "@/types";

interface ProjectScopeOfWorkProps {
  project: Project;
}

export function ProjectScopeOfWork({ project }: ProjectScopeOfWorkProps) {
  const { updateProjectScopeOfWork } = useScheduling();
  const [scope, setScope] = useState(project.scope_of_work ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setScope(project.scope_of_work ?? "");
    setSaved(false);
  }, [project.id, project.scope_of_work]);

  const savedScope = project.scope_of_work ?? "";
  const dirty = scope !== savedScope;

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    try {
      updateProjectScopeOfWork(project.id, scope);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sm:col-span-2 space-y-2 border-t border-border/60 pt-3">
      <p className="text-muted-foreground">Scope of work</p>
      <Textarea
        value={scope}
        onChange={(e) => {
          setScope(e.target.value);
          setSaved(false);
        }}
        placeholder="Describe the project scope, deliverables, and key responsibilities…"
        rows={4}
        className="min-h-[96px] resize-y bg-background"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save scope"}
        </Button>
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
