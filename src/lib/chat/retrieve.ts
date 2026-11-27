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
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: toVectorLiteral(embedding),
      match_count: 6,
    });
    if (error || !Array.isArray(data) || data.length === 0) return "";

    const blocks = data
      .filter((row) => Number(row.similarity) >= 0.3 && typeof row.content === "string")
      .map((row) => `Document: ${row.title}\n${row.content}`);
    if (blocks.length === 0) return "";
    return `Process documents:\n\n${blocks.join("\n\n")}`;
  } catch {
    return "";
  }
}
