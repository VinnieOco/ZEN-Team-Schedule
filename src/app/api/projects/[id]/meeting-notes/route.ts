import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/auth/admin-api";
import { chunkText } from "@/lib/chat/chunk";
import { extractKnowledgeText, isMeetingNotesFile, knowledgeDocumentTitle } from "@/lib/chat/extract";
import { embedPassages, toVectorLiteral } from "@/lib/chat/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/i;

function contentType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectAccess();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "That project was not found." }, { status: 404 });
  }

  const fileId = new URL(request.url).searchParams.get("file")?.trim() ?? "";
  if (fileId) {
    if (!UUID.test(fileId)) {
      return NextResponse.json({ error: "That file was not found." }, { status: 404 });
    }
    const { data: document, error } = await auth.supabase
      .from("project_meeting_documents")
      .select("file_name, storage_path, status")
      .eq("id", fileId)
      .eq("project_id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!document?.storage_path || document.status !== "ready") {
      return NextResponse.json({ error: "That file is not ready to open." }, { status: 404 });
    }
    const downloaded = await auth.supabase.storage.from("meeting-notes").download(document.storage_path);
    if (downloaded.error || !downloaded.data) {
      return NextResponse.json({ error: "That file could not be opened." }, { status: 500 });
    }
    const safeName = document.file_name.replace(/["\r\n]/g, "");
    const disposition = safeName.toLowerCase().endsWith(".pdf") ? "inline" : "attachment";
    return new NextResponse(downloaded.data, {
      headers: {
        "Content-Type": contentType(safeName),
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
      },
    });
  }

  const { data, error } = await auth.supabase
    .from("project_meeting_documents")
    .select("id, title, file_name, status, error, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectAccess();
  if (auth.error) return auth.error;
  if (!auth.canEdit) {
    return NextResponse.json({ error: "You can view meeting notes, but not upload them." }, { status: 403 });
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY on the server before uploading meeting notes." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "That project was not found." }, { status: 404 });
  }

  const { data: project, error: projectError } = await auth.supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "That project was not found." }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a PDF or Word file." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files need to be 8 MB or smaller." }, { status: 400 });
  }
  if (file.name.toLowerCase().endsWith(".doc")) {
    return NextResponse.json(
      { error: "Save that Word file as .docx, then upload it again." },
      { status: 400 },
    );
  }
  if (!isMeetingNotesFile({ name: file.name, type: file.type })) {
    return NextResponse.json({ error: "Upload a PDF or Word (.docx) file." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";
  try {
    text = (await extractKnowledgeText({ name: file.name, type: file.type, bytes })).trim();
  } catch {
    const word = file.name.toLowerCase().endsWith(".docx");
    return NextResponse.json(
      {
        error: word
          ? "That Word file could not be read. Save it as .docx with the notes typed in the document, then try again."
          : "That file could not be read. Scanned PDFs need real text, not just a picture of the page.",
      },
      { status: 400 },
    );
  }
  if (text.length < 20) {
    const word = file.name.toLowerCase().endsWith(".docx");
    return NextResponse.json(
      {
        error: word
          ? "That Word file has no readable text. The notes need to be typed in the document, not only a picture."
          : "That file has no readable text. Scanned PDFs need to be exported with real text.",
      },
      { status: 400 },
    );
  }

  const title = knowledgeDocumentTitle(file.name);
  const { data: document, error: insertError } = await auth.supabase
    .from("project_meeting_documents")
    .insert({
      project_id: id,
      title,
      file_name: file.name.slice(0, 180),
      status: "processing",
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (insertError || !document) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not save the meeting notes." },
      { status: 500 },
    );
  }

  const storagePath = `${id}/${document.id}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error: storageError } = await auth.supabase.storage
    .from("meeting-notes")
    .upload(storagePath, bytes, { contentType: contentType(file.name), upsert: false });
  if (storageError) {
    await auth.supabase
      .from("project_meeting_documents")
      .update({ status: "failed", error: storageError.message })
      .eq("id", document.id);
    return NextResponse.json(
      { error: "Could not store the file. Apply the latest database migration, then try again." },
      { status: 500 },
    );
  }

  await auth.supabase
    .from("project_meeting_documents")
    .update({ storage_path: storagePath })
    .eq("id", document.id);

  try {
    const passages = chunkText(text);
    const vectors = await embedPassages(passages);
    const rows = passages.map((content, ordinal) => ({
      document_id: document.id,
      project_id: id,
      content,
      ordinal,
      embedding: toVectorLiteral(vectors[ordinal] ?? []),
    }));
    const { error: chunkError } = await auth.supabase.from("project_meeting_chunks").insert(rows);
    if (chunkError) throw new Error(chunkError.message);
    await auth.supabase
      .from("project_meeting_documents")
      .update({ status: "ready", error: null })
      .eq("id", document.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare this document.";
    await auth.supabase
      .from("project_meeting_documents")
      .update({ status: "failed", error: message })
      .eq("id", document.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ id: document.id, title, status: "ready" });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireProjectAccess();
  if (auth.error) return auth.error;
  if (!auth.canEdit) {
    return NextResponse.json({ error: "You can view meeting notes, but not remove them." }, { status: 403 });
  }

  const { id } = await context.params;
  const fileId = new URL(request.url).searchParams.get("file")?.trim() ?? "";
  if (!UUID.test(id) || !UUID.test(fileId)) {
    return NextResponse.json({ error: "That file was not found." }, { status: 400 });
  }

  const { data: document } = await auth.supabase
    .from("project_meeting_documents")
    .select("storage_path")
    .eq("id", fileId)
    .eq("project_id", id)
    .maybeSingle();
  if (document?.storage_path) {
    await auth.supabase.storage.from("meeting-notes").remove([document.storage_path]);
  }

  const { error } = await auth.supabase
    .from("project_meeting_documents")
    .delete()
    .eq("id", fileId)
    .eq("project_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
