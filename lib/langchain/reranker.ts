import { Document } from "@langchain/core/documents";
import { llm } from "./llm";

export async function rerankDocuments(
  question: string,
  documents: Document[],
  topK = 5,
): Promise<Document[]> {
  if (documents.length <= topK) {
    return documents;
  }

  const candidates = documents
    .map(
      (doc, index) =>
        `[${index}]
${doc.pageContent}`,
    )
    .join("\n\n");

  const prompt = `You are a document reranker for a RAG system.

Question:
${question}

Candidate documents:
${candidates}

Select the ${topK} most relevant candidate numbers for answering the question.

Return ONLY the numbers separated by commas.
Example:
2,0,5,1,3`;

  try {
    const response = await llm.invoke(prompt);
    const text = response.content.toString();

    const indexes =
      text
        .match(/\d+/g)
        ?.map(Number)
        .filter((index) => index >= 0 && index < documents.length) ?? [];

    const uniqueIndexes = [...new Set(indexes)];

    // If LLM returned valid indices, build reranked list
    const reranked: Document[] = [];
    const usedIndices = new Set<number>();

    for (const index of uniqueIndexes) {
      if (reranked.length < topK && !usedIndices.has(index)) {
        reranked.push(documents[index]);
        usedIndices.add(index);
      }
    }

    // Fallback: fill remaining slots from original documents if reranker returned fewer items
    if (reranked.length < topK) {
      for (let i = 0; i < documents.length && reranked.length < topK; i++) {
        if (!usedIndices.has(i)) {
          reranked.push(documents[i]);
          usedIndices.add(i);
        }
      }
    }

    return reranked;
  } catch (error) {
    return documents.slice(0, topK);
  }
}
