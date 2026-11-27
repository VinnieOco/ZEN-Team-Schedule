"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export function KnowledgeLibraryCard() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
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

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/knowledge", { method: "POST", body: form });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setError(body.error ?? "Could not upload that file.");
    await load();
    setUploading(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Help documents</CardTitle>
        <CardDescription>
          Upload SOPs and other process files. The chat explains answers from them instead of
          sending people to read the file. PDF, Word, text, and Markdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void upload(file);
            }}
          />
          <span className="inline-flex h-9 items-center rounded-lg border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground hover:border-emerald-700 hover:bg-emerald-700">
            {uploading ? "Uploading…" : "Upload a document"}
          </span>
        </label>
        {loading ? (
          <p className="text-sm text-slate-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex items-start justify-between gap-3 rounded-md border bg-slate-50/80 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{document.title}</p>
                  <p className="text-xs text-slate-500">
                    {STATUS_LABEL[document.status] ?? document.status}
                    {document.error ? ` — ${document.error}` : ""}
                  </p>
                </div>
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
