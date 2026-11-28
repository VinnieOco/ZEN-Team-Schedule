"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import { isMeetingNotesFile } from "@/lib/chat/extract";
import { usePermissions } from "@/hooks/use-permissions";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";

interface ClientMeetingNotesSectionProps {
  project: Project;
}

interface MeetingDocument {
  id: string;
  title: string;
  file_name: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
}

const FILE_ACCEPT = ".pdf,.doc,.docx";
const MAX_BYTES = 25 * 1024 * 1024;

function meetingNoteContentType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

async function uploadMeetingNote(projectId: string, file: File): Promise<string | null> {
  const preparedResponse = await fetch(`/api/projects/${projectId}/meeting-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, byteSize: file.size }),
  });
  const prepared = (await preparedResponse.json().catch(() => ({}))) as {
    id?: string;
    storagePath?: string;
    error?: string;
  };
  if (!preparedResponse.ok || !prepared.id || !prepared.storagePath) {
    return `${file.name}: ${prepared.error ?? "Could not upload."}`;
  }

  const stored = await createClient()
    .storage.from("meeting-notes")
    .upload(prepared.storagePath, file, {
      contentType: meetingNoteContentType(file.name),
      upsert: false,
    });
  if (stored.error) {
    await fetch(`/api/projects/${projectId}/meeting-notes?file=${prepared.id}`, { method: "DELETE" });
    const tooLarge = /size|exceeded|too large/i.test(stored.error.message);
    return `${file.name}: ${tooLarge ? "Files need to be 25 MB or smaller." : stored.error.message}`;
  }

  const finished = await fetch(`/api/projects/${projectId}/meeting-notes?process=${prepared.id}`, {
    method: "POST",
  });
  const body = (await finished.json().catch(() => ({}))) as { error?: string };
  if (!finished.ok) return `${file.name}: ${body.error ?? "Could not upload."}`;
  return null;
}

export function ClientMeetingNotesSection({ project }: ClientMeetingNotesSectionProps) {
  const { updateProjectClientMeetingNotesUrl } = useScheduling();
  const { permissions } = usePermissions();
  const canEdit = permissions.editProjects;
  const savedUrl = project.client_meeting_notes_url?.trim() || "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<MeetingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${project.id}/meeting-notes`);
    const body = (await response.json().catch(() => ({}))) as {
      documents?: MeetingDocument[];
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Could not load meeting notes.");
      setDocuments([]);
    } else {
      setDocuments(body.documents ?? []);
      setError(null);
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const uploadMany = async (files: File[]) => {
    if (files.length === 0) {
      setError("That file did not come through. Choose the PDF or Word file again.");
      return;
    }
    const supported = files.filter((file) => isMeetingNotesFile(file));
    if (supported.length === 0) {
      setError("Upload a PDF or Word file (.doc or .docx).");
      return;
    }

    setError(null);
    const failures: string[] = [];
    for (let index = 0; index < supported.length; index += 1) {
      const file = supported[index];
      if (file.size > MAX_BYTES) {
        failures.push(`${file.name}: files need to be 25 MB or smaller.`);
        continue;
      }
      setProgress(`Uploading ${index + 1} of ${supported.length} — ${file.name}`);
      const failure = await uploadMeetingNote(project.id, file);
      if (failure) failures.push(failure);
    }
    setProgress(null);
    await load();
    if (failures.length) setError(failures.slice(0, 3).join(" "));
  };

  const remove = async (document: MeetingDocument) => {
    if (!window.confirm(`Remove “${document.title}” from this project?`)) return;
    setError(null);
    const response = await fetch(
      `/api/projects/${project.id}/meeting-notes?file=${document.id}`,
      { method: "DELETE" },
    );
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Could not remove that file.");
      return;
    }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
  };

  const clearLink = () => {
    if (!savedUrl || !window.confirm("Remove the older meeting notes link?")) return;
    updateProjectClientMeetingNotesUrl(project.id, null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client meeting notes</CardTitle>
        <CardDescription>
          Upload a PDF or Word file from the client meeting, up to 25 MB. The chat can read it and
          answer questions about this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {progress ? <p className="text-sm text-slate-600">{progress}</p> : null}
        {canEdit ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={progress !== null}
              onClick={() => fileInputRef.current?.click()}
            >
              {progress ? "Uploading…" : "Upload files"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="hidden"
              disabled={progress !== null}
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                event.target.value = "";
                void uploadMany(chosen);
              }}
            />
          </>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading meeting notes…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meeting notes have been uploaded yet.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{document.title}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {document.status === "ready"
                      ? document.file_name
                      : document.status === "failed"
                        ? document.error || "Could not read this file."
                        : "Reading…"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {document.status === "ready" ? (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a
                        href={`/api/projects/${project.id}/meeting-notes?file=${document.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </a>
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => void remove(document)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {savedUrl ? (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">Older link: {savedUrl}</span>
            </a>
            {canEdit ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearLink}>
                Remove link
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
