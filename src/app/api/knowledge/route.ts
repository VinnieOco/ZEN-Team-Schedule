import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin-api";
import { chunkText } from "@/lib/chat/chunk";
import { extractKnowledgeText, isSupportedKnowledgeFile } from "@/lib/chat/extract";
import { embedPassages, toVectorLiteral } from "@/lib/chat/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("knowledge_documents")
    .select("id, title, status, error, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY on the server before uploading documents." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a PDF, Word, text, or Markdown file." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files need to be 8 MB or smaller." }, { status: 400 });
  }
  if (!isSupportedKnowledgeFile({ name: file.name, type: file.type })) {
    return NextResponse.json(
      { error: "Upload a PDF, Word (.docx), text, or Markdown file." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";
  try {
    text = (await extractKnowledgeText({ name: file.name, type: file.type, bytes })).trim();
  } catch {
    return NextResponse.json(
      { error: "That file could not be read. Scanned PDFs need real text, not just a picture of the page." },
      { status: 400 },
    );
  }
  if (text.length < 20) {
    return NextResponse.json(
      { error: "That file has no readable text. Scanned PDFs need to be exported with real text." },
      { status: 400 },
    );
  }

  const title = file.name.replace(/\.[^.]+$/, "").trim() || "Untitled";
  const { data: document, error: insertError } = await auth.supabase
    .from("knowledge_documents")
    .insert({ title, status: "processing", created_by: auth.user.id })
    .select("id")
    .single();

  if (insertError || !document) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not save the document." },
      { status: 500 },
    );
  }

  const storagePath = `${auth.user.id}/${document.id}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error: storageError } = await auth.supabase.storage
    .from("knowledge")
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });

  if (storageError) {
    await auth.supabase
      .from("knowledge_documents")
      .update({ status: "failed", error: storageError.message })
      .eq("id", document.id);
    return NextResponse.json(
      { error: "Could not store the file. Apply the latest database migration, then try again." },
      { status: 500 },
    );
  }

  await auth.supabase
    .from("knowledge_documents")
    .update({ storage_path: storagePath })
    .eq("id", document.id);

  try {
    const passages = chunkText(text);
    const vectors = await embedPassages(passages);
    const rows = passages.map((content, ordinal) => ({
      document_id: document.id,
      content,
      ordinal,
      embedding: toVectorLiteral(vectors[ordinal] ?? []),
    }));
    const { error: chunkError } = await auth.supabase.from("knowledge_chunks").insert(rows);
    if (chunkError) throw new Error(chunkError.message);
    await auth.supabase
      .from("knowledge_documents")
      .update({ status: "ready", error: null })
      .eq("id", document.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare this document.";
    await auth.supabase
      .from("knowledge_documents")
      .update({ status: "failed", error: message })
      .eq("id", document.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ id: document.id, title, status: "ready" });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "That document was not found." }, { status: 400 });
  }

  const { data: document } = await auth.supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (document?.storage_path) {
    await auth.supabase.storage.from("knowledge").remove([document.storage_path]);
  }

  const { error } = await auth.supabase.from("knowledge_documents").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
