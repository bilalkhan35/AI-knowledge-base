export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

export const CHAT_MODEL =
  process.env.CHAT_MODEL ?? process.env.OLLAMA_CHAT_MODEL ?? "gemma3:1b";

export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "nomic-embed-text:latest";

export function isOllamaModelNotFoundError(error: unknown) {
  const maybeError = error as {
    status_code?: number;
    status?: number;
    error?: string;
    message?: string;
  };

  const message = `${maybeError.error ?? ""} ${maybeError.message ?? ""}`
    .toLowerCase()
    .trim();

  return (
    maybeError.status_code === 404 ||
    maybeError.status === 404 ||
    (message.includes("model") && message.includes("not found"))
  );
}

export function getMissingOllamaModelMessage(model = CHAT_MODEL) {
  return `Ollama model '${model}' is not available. Run 'ollama pull ${model}' or set CHAT_MODEL to a model from 'ollama list'.`;
}
