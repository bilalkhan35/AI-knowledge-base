import { supabase } from "./supabase";

export async function searchChunks(
  embedding: number[],
  limit = 6,
  threshold = 0.25,
  documentId?: string,
) {
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: limit,
    similarity_threshold: threshold,
    filter_document_id: documentId ?? null,
  });

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return data;
}
export async function keywordSearchChunks(
  query: string,
  limit = 15,
  documentId?: string,
) {
  const { data, error } = await supabase.rpc("keyword_search_document_chunks", {
    search_query: query,
    match_count: limit,
    filter_document_id: documentId ?? null,
  });

  if (error) {
    throw new Error(`Keyword search failed: ${error.message}`);
  }

  return data;
}
