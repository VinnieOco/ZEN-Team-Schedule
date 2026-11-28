import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/auth/admin-api";
import { chunkText } from "@/lib/chat/chunk";
import { extractKnowledgeText, isMeetingNotesFile, knowledgeDocumentTitle } from "@/lib/chat/extract";
import { embedPassages, toVectorLiteral } from "@/lib/chat/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_LABEL = "25 MB";
const UUID = /^[0-9a-f-]{36}$/i;

function contentType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
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

  const processId = new URL(request.url).searchParams.get("process")?.trim() ?? "";
  if (processId) return finishMeetingNote(auth.supabase, id, processId);

  let payload: { fileName?: unknown; byteSize?: unknown };
  try {
    payload = (await request.json()) as { fileName?: unknown; byteSize?: unknown };
  } catch {
    return NextResponse.json({ error: "Choose a PDF or Word file." }, { status: 400 });
  }

  const fileName = typeof payload.fileName === "string" ? payload.fileName.trim().slice(0, 180) : "";
  const byteSize = typeof payload.byteSize === "number" ? payload.byteSize : Number.NaN;
  if (!fileName || !Number.isFinite(byteSize) || byteSize <= 0) {
    return NextResponse.json({ error: "Choose a PDF or Word file." }, { status: 400 });
  }
  if (byteSize > MAX_BYTES) {
    return NextResponse.json({ error: `Files need to be ${MAX_LABEL} or smaller.` }, { status: 400 });
  }
  if (!isMeetingNotesFile({ name: fileName, type: "" })) {
    return NextResponse.json({ error: "Upload a PDF or Word file (.doc or .docx)." }, { status: 400 });
  }

  const title = knowledgeDocumentTitle(fileName);
  const { data: document, error: insertError } = await auth.supabase
    .from("project_meeting_documents")
    .insert({
      project_id: id,
      title,
      file_name: fileName,
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

  const storagePath = `${id}/${document.id}-${fileName.replace(/[^\w.\-]+/g, "_")}`;
  const { error: pathError } = await auth.supabase
    .from("project_meeting_documents")
    .update({ storage_path: storagePath })
    .eq("id", document.id);
  if (pathError) {
    await auth.supabase.from("project_meeting_documents").delete().eq("id", document.id);
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
  }

  return NextResponse.json({ id: document.id, storagePath });
}

async function finishMeetingNote(
  supabase: Awaited<ReturnType<typeof requireProjectAccess>>["supabase"],
  projectId: string,
  documentId: string,
): Promise<NextResponse> {
  if (!UUID.test(documentId) || !supabase) {
    return NextResponse.json({ error: "That file was not found." }, { status: 400 });
  }

  const { data: document, error } = await supabase
    .from("project_meeting_documents")
    .select("id, file_name, storage_path, status")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!document?.storage_path) {
    return NextResponse.json({ error: "That file was not found." }, { status: 404 });
  }

  const downloaded = await supabase.storage.from("meeting-notes").download(document.storage_path);
  if (downloaded.error || !downloaded.data) {
    await supabase
      .from("project_meeting_documents")
      .update({ status: "failed", error: "The file did not finish uploading." })
      .eq("id", document.id);
    return NextResponse.json({ error: "The file did not finish uploading. Try it again." }, { status: 400 });
  }

  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    await supabase.storage.from("meeting-notes").remove([document.storage_path]);
    await supabase
      .from("project_meeting_documents")
      .update({ status: "failed", error: `Files need to be ${MAX_LABEL} or smaller.` })
      .eq("id", document.id);
    return NextResponse.json({ error: `Files need to be ${MAX_LABEL} or smaller.` }, { status: 400 });
  }

  const word = document.file_name.toLowerCase().endsWith(".doc");
  let text = "";
  try {
    text = (await extractKnowledgeText({ name: document.file_name, type: contentType(document.file_name), bytes })).trim();
  } catch {
    const message = word
      ? "That Word file could not be read. It needs to be a .doc or .docx with the notes typed in the document."
      : "That file could not be read. Scanned PDFs need real text, not just a picture of the page.";
    await supabase.from("project_meeting_documents").update({ status: "failed", error: message }).eq("id", document.id);
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (text.length < 20) {
    const message = word
      ? "That Word file has no readable text. The notes need to be typed in the document, not only a picture."
      : "That file has no readable text. Scanned PDFs need to be exported with real text.";
    await supabase.from("project_meeting_documents").update({ status: "failed", error: message }).eq("id", document.id);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const passages = chunkText(text);
    const vectors = await embedPassages(passages);
    const rows = passages.map((content, ordinal) => ({
      document_id: document.id,
      project_id: projectId,
      content,
      ordinal,
      embedding: toVectorLiteral(vectors[ordinal] ?? []),
    }));
    const { error: chunkError } = await supabase.from("project_meeting_chunks").insert(rows);
    if (chunkError) throw new Error(chunkError.message);
    await supabase.from("project_meeting_documents").update({ status: "ready", error: null }).eq("id", document.id);
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : "Could not prepare this document.";
    await supabase.from("project_meeting_documents").update({ status: "failed", error: message }).eq("id", document.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ id: document.id, status: "ready" });
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
