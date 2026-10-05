import { extractTextFromPDF } from "./pdf";
import { chunkText } from "./chunk";
import { embedChunks } from "./embedding";
import { saveChunks } from "./document";
import path from "path";

export async function ingestPDF(filePath: string) {
  // 1. Extract text from PDF
  const text = await extractTextFromPDF(filePath);

  // 2. Split text into chunks
  const documentId = crypto.randomUUID();

  const fileName = path.basename(filePath);
  const chunks = chunkText(text, fileName, documentId);

  // 3. Create embeddings for every chunk
  const embeddedChunks = await embedChunks(chunks);

  // 4. Save chunks + embeddings to Supabase
  const chunksWithMetadata = embeddedChunks.map((chunk) => ({
    ...chunk,
    fileName,
    documentId,
  }));
  const savedChunks = await saveChunks(chunksWithMetadata);

  return {
    textLength: text.length,
    chunkCount: chunks.length,
    savedCount: savedChunks.length,
  };
}
