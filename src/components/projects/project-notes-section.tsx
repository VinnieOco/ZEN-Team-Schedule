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

const VISIBLE_SAVED_NOTES = 5;

function noteCreatedAtMs(note: ProjectNote) {
  return new Date(note.created_at).getTime();
}

/** Newest notes first. */
function sortNotesNewestFirst(notes: ProjectNote[]) {
  return [...notes].sort((a, b) => noteCreatedAtMs(b) - noteCreatedAtMs(a));
}

function formatNoteDate(iso: string) {
  return format(parseISO(iso), "MMM d, yyyy");
}

interface SavedProjectNoteProps {
  note: ProjectNote;
  onSave: (id: string, body: string) => void;
}

function SavedProjectNote({ note, onSave }: SavedProjectNoteProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBody(note.body);
    setEditing(false);
  }, [note.id, note.body, note.updated_at]);

  const handleSave = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      onSave(note.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBody(note.body);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2 py-3">
        <p className="text-xs text-muted-foreground">{formatNoteDate(note.created_at)}</p>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="min-h-[96px] resize-y"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!body.trim() || body.trim() === note.body || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 py-3">
      <p className="w-[5.5rem] shrink-0 text-xs text-muted-foreground pt-0.5">
        {formatNoteDate(note.created_at)}
      </p>
      <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 -mt-1 h-8 px-2 text-muted-foreground"
        onClick={() => setEditing(true)}
      >
        Edit
      </Button>
    </div>
  );
}

export function ProjectNotesSection({ project }: ProjectNotesSectionProps) {
  const { projectNotes, addProjectNote, updateProjectNote } = useScheduling();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAllSavedNotes, setShowAllSavedNotes] = useState(false);

  const savedNotes = useMemo(
    () => sortNotesNewestFirst(projectNotes.filter((n) => n.project_id === project.id)),
    [projectNotes, project.id],
  );

  const hiddenNoteCount = Math.max(0, savedNotes.length - VISIBLE_SAVED_NOTES);
  const visibleSavedNotes = showAllSavedNotes
    ? savedNotes
    : savedNotes.slice(0, VISIBLE_SAVED_NOTES);

  useEffect(() => {
    setShowAllSavedNotes(false);
  }, [project.id]);

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
          <section className="space-y-1">
            <h3 className="text-sm font-semibold mb-2">Saved team notes</h3>
            <div className="divide-y divide-border/60">
              {visibleSavedNotes.map((note) => (
                <SavedProjectNote
                  key={note.id}
                  note={note}
                  onSave={updateProjectNote}
                />
              ))}
            </div>
            {hiddenNoteCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 text-sm font-normal text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllSavedNotes((open) => !open)}
              >
                {showAllSavedNotes
                  ? "Show less"
                  : `More (${hiddenNoteCount} older note${hiddenNoteCount === 1 ? "" : "s"})`}
              </Button>
            )}
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
