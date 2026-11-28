import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const EMBEDDING_MODEL = "text-embedding-3-small";

export function embeddingModel() {
  return openai.embedding(EMBEDDING_MODEL);
}

export async function embedPassages(values: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let index = 0; index < values.length; index += 64) {
    const batch = values.slice(index, index + 64);
    const { embeddings } = await embedMany({
      model: embeddingModel(),
      values: batch,
    });
    vectors.push(...embeddings);
  }
  return vectors;
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function retrievePassages(supabase: Supabase, question: string): Promise<string> {
  try {
    const { embedding } = await embed({
      model: embeddingModel(),
      value: question.slice(0, 4000),
    });
    const vector = toVectorLiteral(embedding);
    const [documents, meetings] = await Promise.all([
      supabase.rpc("match_knowledge_chunks", {
        query_embedding: vector,
        match_count: 6,
      }),
      supabase.rpc("match_project_meeting_chunks", {
        query_embedding: vector,
        match_count: 6,
      }),
    ]);

    const sections: string[] = [];
    if (!documents.error && Array.isArray(documents.data) && documents.data.length > 0) {
      const blocks = documents.data
        .filter((row) => Number(row.similarity) >= 0.3 && typeof row.content === "string")
        .map((row) => `Document: ${row.title}\n${row.content}`);
      if (blocks.length) sections.push(`Process documents:\n\n${blocks.join("\n\n")}`);
    }
    if (!meetings.error && Array.isArray(meetings.data) && meetings.data.length > 0) {
      const blocks = meetings.data
        .filter((row) => Number(row.similarity) >= 0.3 && typeof row.content === "string")
        .map((row) => {
          const project = typeof row.project_name === "string" ? row.project_name : "Project";
          const title = typeof row.title === "string" ? row.title : "Meeting notes";
          return `Document: ${project} — ${title}\n${row.content}`;
        });
      if (blocks.length) sections.push(`Client meeting notes:\n\n${blocks.join("\n\n")}`);
    }
    return sections.join("\n\n");
  } catch {
    return "";
  }
}
