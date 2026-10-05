const OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-small";

function getOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return key;
}

export async function createEmbedding(text: string) {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_EMBEDDING_MODEL,
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Embedding request failed: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();

  return data.data[0].embedding;
}

export async function embedChunks(
  chunks: { content: string; index: number }[],
) {
  const results = [];

  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk.content);

    results.push({
      ...chunk,
      embedding,
    });
  }

  return results;
}
