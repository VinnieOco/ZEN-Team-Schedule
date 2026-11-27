"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isSupportedKnowledgeFile, knowledgeDocumentTitle } from "@/lib/chat/extract";

interface KnowledgeDocument {
  id: string;
  title: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<KnowledgeDocument["status"], string> = {
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

const FILE_ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown";

export function KnowledgeLibraryCard() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/knowledge");
    const body = (await response.json().catch(() => ({}))) as {
      documents?: KnowledgeDocument[];
      error?: string;
    };
    if (!response.ok) {
      setError(body.error ?? "Could not load documents.");
      setDocuments([]);
    } else {
      setDocuments(body.documents ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((document) => document.title.toLowerCase().includes(term));
  }, [documents, query]);

  const uploadMany = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    const supported = files.filter((file) => isSupportedKnowledgeFile(file));
    const skipped = files.length - supported.length;
    if (supported.length === 0) {
      setNotice(null);
      setError("None of those files are PDF, Word, text, or Markdown.");
      return;
    }

    setProgress(`Uploading 1 of ${supported.length}`);
    setError(null);
    setNotice(null);
    const failures: string[] = [];

    for (let index = 0; index < supported.length; index += 1) {
      const file = supported[index];
      const title = knowledgeDocumentTitle(file.name, file.webkitRelativePath);
      setProgress(`Uploading ${index + 1} of ${supported.length} — ${title}`);
      const form = new FormData();
      form.set("file", file);
      form.set("title", title);
      const response = await fetch("/api/knowledge", { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) failures.push(`${title}: ${body.error ?? "Could not upload."}`);
    }

    await load();
    setProgress(null);
    const added = supported.length - failures.length;
    const parts = [`Added ${added} ${added === 1 ? "document" : "documents"}.`];
    if (skipped > 0) {
      parts.push(`Skipped ${skipped} ${skipped === 1 ? "file" : "files"} that aren’t supported.`);
    }
    if (failures.length > 0) {
      setError(failures.slice(0, 4).join(" "));
    }
    setNotice(parts.join(" "));
  };

  const remove = async (document: KnowledgeDocument) => {
    if (!window.confirm(`Remove “${document.title}” from the chat?`)) return;
    setError(null);
    const response = await fetch(`/api/knowledge?id=${document.id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Could not remove that document.");
      return;
    }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
  };

  const readyCount = documents.filter((document) => document.status === "ready").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Help documents</CardTitle>
        <CardDescription>
          {loading
            ? "Loading documents…"
            : `${documents.length} ${documents.length === 1 ? "document" : "documents"}, ${readyCount} ready for the chat.`}{" "}
          PDF, Word, text, and Markdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-slate-600">{notice}</p>}
        {progress && <p className="text-sm text-slate-600">{progress}</p>}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="sr-only"
              disabled={progress !== null}
              onChange={(event) => {
                const chosen = event.target.files;
                event.target.value = "";
                void uploadMany(chosen);
              }}
            />
            <span className="inline-flex h-9 items-center rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground hover:border-emerald-700 hover:bg-emerald-700">
              {progress ? "Uploading…" : "Upload files"}
            </span>
          </label>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={progress !== null}
              ref={(node) => {
                node?.setAttribute("webkitdirectory", "");
                node?.setAttribute("directory", "");
              }}
              onChange={(event) => {
                const chosen = event.target.files;
                event.target.value = "";
                void uploadMany(chosen);
              }}
            />
            <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50">
              Upload a folder
            </span>
          </label>
        </div>
        {!loading && documents.length > 0 && (
          <Input
            value={query}
            placeholder="Search documents"
            aria-label="Search documents"
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {loading ? null : documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents yet.</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">No documents match that search.</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto rounded-md border">
            {visible.map((document) => (
              <li
                key={document.id}
                className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-900">{document.title}</p>
                  {document.error && (
                    <p className="truncate text-xs text-red-700">{document.error}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {STATUS_LABEL[document.status] ?? document.status}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => void remove(document)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
