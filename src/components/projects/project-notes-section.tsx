"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useScheduling } from "@/context/scheduling-context";
import type { Project, ProjectNote } from "@/types";

interface ProjectNotesSectionProps {
  project: Project;
}

function formatNoteTimestamp(iso: string) {
  return format(parseISO(iso), "MMMM d, yyyy 'at' h:mm a");
}

interface SavedProjectNoteProps {
  note: ProjectNote;
  onSave: (id: string, body: string) => void;
}

function SavedProjectNote({ note, onSave }: SavedProjectNoteProps) {
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBody(note.body);
    setSaved(false);
  }, [note.id, note.body, note.updated_at]);

  const dirty = body.trim() !== note.body;

  const handleSave = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(false);
    try {
      onSave(note.id, trimmed);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const edited =
    note.updated_at !== note.created_at
      ? ` · edited ${formatNoteTimestamp(note.updated_at)}`
      : "";

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Saved {formatNoteTimestamp(note.created_at)}
        {edited}
      </p>
      <Textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSaved(false);
        }}
        rows={4}
        className="min-h-[96px] resize-y bg-background"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
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
    </div>
  );
}

export function ProjectNotesSection({ project }: ProjectNotesSectionProps) {
  const { projectNotes, addProjectNote, updateProjectNote } = useScheduling();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const savedNotes = useMemo(
    () =>
      projectNotes
        .filter((n) => n.project_id === project.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [projectNotes, project.id],
  );

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(false);
    try {
      addProjectNote(project.id, trimmed);
      setDraft("");
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
          Save dated notes for the team. Past notes stay above; add new ones below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {savedNotes.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Saved team notes</h3>
            <div className="space-y-3">
              {savedNotes.map((note) => (
                <SavedProjectNote
                  key={note.id}
                  note={note}
                  onSave={updateProjectNote}
                />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Add a note</h3>
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
            placeholder="Site access, client preferences, deadlines, coordination details…"
            rows={6}
            className="min-h-[120px] resize-y"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!draft.trim() || saving}
            >
              {saving ? "Saving…" : "Save note"}
            </Button>
            {saved && !draft.trim() && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                <Check className="h-4 w-4" />
                Note saved
              </span>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
