import { BaseRetriever } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { createEmbedding } from "@/lib/embedding";
import { searchChunks } from "@/lib/search";

export class SupabaseRetriever extends BaseRetriever {
  lc_namespace = ["custom", "supabase"];

  constructor(
    private k = 8,
    private threshold = 0.2,
    private documentId?: string,
  ) {
    super();
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const embedding = await createEmbedding(query);

    const results = await searchChunks(
      embedding,
      this.k,
      this.threshold,
      this.documentId,
    );

    return results.map(
      (result: {
        content: string;
        file_name: string;
        document_id: string;
        chunk_index: number;
        similarity: number;
      }) =>
        new Document({
          pageContent: result.content,
          metadata: {
            fileName: result.file_name,
            documentId: result.document_id,
            chunkIndex: result.chunk_index,
            similarity: result.similarity,
          },
        }),
    );
  }
}
