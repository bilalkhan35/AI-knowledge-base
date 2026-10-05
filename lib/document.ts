import { supabase } from "./supabase";

export async function saveChunks(
  chunks: {
    content: string;
    index: number;
    embedding: number[];
    fileName: string;
    documentId: string;
  }[],
) {
  const rows = chunks.map((chunk) => ({
    content: chunk.content,
    chunk_index: chunk.index,
    embedding: chunk.embedding,
    file_name: chunk.fileName,
    document_id: chunk.documentId,
  }));

  const { data, error } = await supabase
    .from("document_chunks")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`Failed to save chunks: ${error.message}`);
  }

  return data;
}
