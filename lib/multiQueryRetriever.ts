import { Document } from "@langchain/core/documents";
import { SupabaseRetriever } from "./langchain/retriever";
import { keywordSearchChunks } from "./../lib/search";
import { generateSearchQueries } from "./../lib/langchain/queryGenerator";

export async function multiQueryRetrieve(
  question: string,
  documentId?: string,
): Promise<Document[]> {
  const retriever = new SupabaseRetriever(8, 0.2, documentId);

  const generatedQueries = await generateSearchQueries(question).catch(
    () => [],
  );

  // Always include the original question first
  const queries = Array.from(new Set([question, ...generatedQueries])).filter(
    (q) => q && q.trim().length > 0,
  );

  /*
   * Run BOTH retrieval methods for every query:
   *
   * Vector search  → semantic meaning
   * Keyword search → exact terms
   */
  const allResults = await Promise.all(
    queries.map(async (query) => {
      const [vectorResults, keywordResults] = await Promise.all([
        retriever.invoke(query).catch(() => []),
        keywordSearchChunks(query, 8, documentId).catch(() => []),
      ]);

      return {
        vectorResults,
        keywordResults,
      };
    }),
  );

  /*
   * Reciprocal Rank Fusion (RRF)
   *
   * We combine rankings instead of comparing
   * vector similarity and keyword rank directly.
   */
  const scores = new Map<
    string,
    {
      score: number;
      document: Document;
    }
  >();

  const RRF_K = 60;

  for (const { vectorResults, keywordResults } of allResults) {
    // Vector results
    vectorResults.forEach((document, index) => {
      const key = `${document.metadata.documentId ?? "doc"}-${
        document.metadata.chunkIndex ?? document.pageContent.slice(0, 50)
      }`;

      const contribution = 1 / (RRF_K + index + 1);

      const existing = scores.get(key);

      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(key, {
          score: contribution,
          document,
        });
      }
    });

    // Keyword results
    keywordResults.forEach((result: any, index: number) => {
      const key = `${result.document_id ?? "doc"}-${
        result.chunk_index ?? result.content.slice(0, 50)
      }`;

      const contribution = 1 / (RRF_K + index + 1);

      const existing = scores.get(key);

      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(key, {
          score: contribution,
          document: new Document({
            pageContent: result.content,
            metadata: {
              fileName: result.file_name,
              documentId: result.document_id,
              chunkIndex: result.chunk_index,
              keywordRank: result.rank,
            },
          }),
        });
      }
    });
  }

  /*
   * Sort by combined hybrid score.
   */
  const results = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ document, score }) => {
      document.metadata.hybridScore = score;
      return document;
    });

  return results;
}
