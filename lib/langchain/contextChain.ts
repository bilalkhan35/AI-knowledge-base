import { Document } from "@langchain/core/documents";

export function buildContext(documents: Document[], maxDocuments = 5) {
  return documents
    .slice(0, maxDocuments)
    .map((doc, index) => {
      const source = doc.metadata.fileName ?? "Unknown source";
      const chunk = doc.metadata.chunkIndex ?? "Unknown";

      return `[Source ${index + 1}]
File: ${source}
Chunk: ${chunk}

${doc.pageContent}`;
    })
    .join("\n\n");
}
