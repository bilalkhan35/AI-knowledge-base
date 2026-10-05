export type TextChunk = {
  content: string;
  index: number;
  fileName: string;
  documentId: string;
};

export function chunkText(
  text: string,
  fileName: string,
  documentId: string,
  chunkSize = 500,
  overlap = 100,
): TextChunk[] {
  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error("Chunk overlap must be >= 0 and less than chunkSize.");
  }

  const cleanText = text.trim();
  if (!cleanText) return [];

  // Split into paragraphs/sections first
  const rawParagraphs = cleanText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Helper to split oversized paragraph into smaller sentences
  const splitParagraph = (paragraph: string): string[] => {
    if (paragraph.length <= chunkSize) return [paragraph];

    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length <= 1) return [paragraph];
    return sentences;
  };

  const blocks: string[] = [];
  for (const paragraph of rawParagraphs) {
    blocks.push(...splitParagraph(paragraph));
  }

  const chunks: TextChunk[] = [];
  let currentChunkText = "";
  let chunkIndex = 0;

  for (const block of blocks) {
    const separator = currentChunkText ? "\n\n" : "";
    const prospectiveLength = currentChunkText.length + separator.length + block.length;

    if (prospectiveLength <= chunkSize || !currentChunkText) {
      currentChunkText += separator + block;
    } else {
      chunks.push({
        content: currentChunkText.trim(),
        index: chunkIndex++,
        fileName,
        documentId,
      });

      // Compute overlapping text from the tail of currentChunkText
      let overlapText = "";
      if (overlap > 0) {
        const words = currentChunkText.trim().split(/\s+/);
        for (let i = words.length - 1; i >= 0; i--) {
          const candidate = words.slice(i).join(" ");
          if (candidate.length <= overlap) {
            overlapText = candidate;
          } else {
            break;
          }
        }
      }

      currentChunkText = overlapText
        ? overlapText + "\n\n" + block
        : block;
    }
  }

  if (currentChunkText.trim()) {
    chunks.push({
      content: currentChunkText.trim(),
      index: chunkIndex,
      fileName,
      documentId,
    });
  }

  return chunks;
}
