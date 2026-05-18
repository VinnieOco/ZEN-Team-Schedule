"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import type { Project } from "@/types";

interface ProjectNotesSectionProps {
  project: Project;
}

export function ProjectNotesSection({ project }: ProjectNotesSectionProps) {
  const { updateProjectNotes } = useScheduling();
  const [notes, setNotes] = useState(project.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotes(project.notes ?? "");
    setSaved(false);
  }, [project.id, project.notes]);

  const savedNotes = project.notes ?? "";
  const dirty = notes !== savedNotes;

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    try {
      updateProjectNotes(project.id, notes);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team notes</CardTitle>
        <CardDescription>
          Add important project details for the team. Anyone can view and update these notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Site access, client preferences, deadlines, coordination details…"
          rows={6}
          className="min-h-[120px] resize-y"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save notes"}
          </Button>
          {saved && !dirty && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          {dirty && !saving && (
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
