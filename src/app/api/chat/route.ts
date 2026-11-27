import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";

import { getPermissions } from "@/lib/auth/permissions";
import { parseAppRole } from "@/lib/auth/roles";
import { appGuideNotes } from "@/lib/chat/guide";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { retrievePassages } from "@/lib/chat/retrieve";
import { liveSiteNotes } from "@/lib/chat/site-notes";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 60;

function lastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY on the server before the chat can answer." },
      { status: 503 },
    );
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let userId: string | null = null;
  let role = parseAppRole(null);

  if (isSupabaseConfigured()) {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    userId = user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .maybeSingle();
    role = parseAppRole(profile?.app_role);
  }

  let body: { messages?: UIMessage[]; pathname?: string };
  try {
    body = (await request.json()) as { messages?: UIMessage[]; pathname?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
  const question = lastUserText(messages).slice(0, 4000);
  if (!question) {
    return NextResponse.json({ error: "Ask a question to get started." }, { status: 400 });
  }

  const pathname = typeof body.pathname === "string" ? body.pathname.slice(0, 200) : "/";
  const notes = [appGuideNotes(pathname)];

  if (supabase && userId) {
    const permissions = getPermissions(role);
    const [passages, live] = await Promise.all([
      retrievePassages(supabase, question),
      liveSiteNotes({ supabase, permissions, question, pathname, userId }),
    ]);
    if (passages) notes.push(passages);
    if (live) notes.push(live);
  }

  const result = streamText({
    model: openai(process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4.1"),
    system: `${CHAT_SYSTEM_PROMPT}\n\n${notes.join("\n\n")}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
