"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Link2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import type { Project } from "@/types";

interface ClientMeetingNotesSectionProps {
  project: Project;
}

function normalizeUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isLikelyUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function ClientMeetingNotesSection({ project }: ClientMeetingNotesSectionProps) {
  const { updateProjectClientMeetingNotesUrl } = useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editProjects;

  const savedUrl = project.client_meeting_notes_url?.trim() || "";
  const [editing, setEditing] = useState(!savedUrl && canEdit);
  const [draft, setDraft] = useState(savedUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(project.client_meeting_notes_url?.trim() || "");
    setEditing(!(project.client_meeting_notes_url?.trim()) && canEdit);
    setError(null);
  }, [project.id, project.client_meeting_notes_url, canEdit]);

  const handleSave = () => {
    if (!canEdit) return;
    if (!isLikelyUrl(draft)) {
      setError("Enter a valid link (for example https://…).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      updateProjectClientMeetingNotesUrl(project.id, normalizeUrl(draft) ?? null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (!canEdit) return;
    if (savedUrl && !window.confirm("Remove the client meeting notes link?")) return;
    setSaving(true);
    setError(null);
    try {
      updateProjectClientMeetingNotesUrl(project.id, null);
      setDraft("");
      setEditing(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client meeting notes</CardTitle>
        <CardDescription>
          Link to the meeting notes document for this job in your shared database or drive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!editing && savedUrl ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">{savedUrl}</span>
            </a>
            {canEdit && (
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(savedUrl);
                    setEditing(true);
                    setError(null);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit link
                </Button>
              </div>
            )}
          </div>
        ) : canEdit ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`client-meeting-notes-url-${project.id}`}>Document link</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={`client-meeting-notes-url-${project.id}`}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://…"
                    className="pl-9"
                    inputMode="url"
                    autoComplete="off"
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : savedUrl ? "Save link" : "Add link"}
                  </Button>
                  {savedUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDraft(savedUrl);
                        setEditing(false);
                        setError(null);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </div>
            {savedUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-red-600 hover:text-red-700"
                onClick={handleClear}
                disabled={saving}
              >
                Remove link
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Paste the URL to the client meeting notes file so the team can open it from this
                project.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No meeting notes link has been added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
