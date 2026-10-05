import { llm } from "./llm";

export async function generateSearchQueries(
  question: string,
): Promise<string[]> {
  const prompt = `You are a search query generator for a RAG system.

Given the user's question, generate 3 different search queries
that could retrieve relevant information from a knowledge base.

Make each query:
- concise
- semantically different
- focused on the same information need

Return ONLY the 3 queries, one per line. Do not include numbering, bullets, quotes, or preamble.

User question:
${question}`;

  try {
    const response = await llm.invoke(prompt);
    const text = response.content.toString();

    const lines = text.split("\n");
    const queries: string[] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      // Skip meta-commentary or intro preambles
      if (
        lower.includes("here are") ||
        lower.includes("search queries") ||
        lower.includes("following queries") ||
        lower.includes("sure,") ||
        lower.endsWith(":")
      ) {
        continue;
      }

      // Strip list formatting numbers/bullets and surrounding quotes
      const cleaned = line
        .replace(/^\s*[\d\-\*\.]+[.)\-:]\s*/, "")
        .replace(/^['"]|['"]$/g, "")
        .trim();

      if (cleaned.length > 3) {
        queries.push(cleaned);
      }
    }

    return queries.slice(0, 3);
  } catch (error) {
    return [];
  }
}
