import { ragChain } from "@/lib/langchain/rag";
import {
  getMissingOllamaModelMessage,
  isOllamaModelNotFoundError,
} from "@/lib/ollamaConfig";
import { createConversation, saveMessage } from "@/lib/chat";

export async function POST(request: Request) {
  try {
    const { question, documentId, userId, conversationId } =
      await request.json();

    if (!question?.trim()) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }
    if (!documentId?.trim()) {
      return Response.json(
        { error: "Please select a document" },
        { status: 400 },
      );
    }

    let activeConversationId: string | undefined = conversationId || undefined;

    if (userId?.trim() && !activeConversationId) {
      const trimmedQ = question.trim();
      const title =
        trimmedQ.length > 40 ? trimmedQ.slice(0, 37) + "..." : trimmedQ;
      const conversation = await createConversation(
        userId.trim(),
        documentId.trim(),
        title,
      );
      activeConversationId = conversation.id;
    }

    if (activeConversationId) {
      await saveMessage(activeConversationId, "user", question.trim());
    }

    const { stream, sources } = await ragChain.stream(question, documentId);

    const encoder = new TextEncoder();
    const normalizeChunkText = (value: unknown): string => {
      if (typeof value === "string") return value;

      if (Array.isArray(value)) {
        return value.map((item) => normalizeChunkText(item)).join("");
      }

      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;

        if (typeof record.text === "string") return record.text;
        if (typeof record.content === "string") return record.content;
        if (Array.isArray(record.content)) {
          return record.content
            .map((item) => normalizeChunkText(item))
            .join("");
        }
        if (record.content && typeof record.content === "object") {
          return normalizeChunkText(record.content);
        }
        if (typeof record.output === "string") return record.output;
        if (typeof record.response === "string") return record.response;
        if (typeof record.message === "string") return record.message;
        if (record.message && typeof record.message === "object") {
          return normalizeChunkText(record.message);
        }
      }

      return "";
    };

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (activeConversationId) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "conversation",
                  conversationId: activeConversationId,
                }) + "\n",
              ),
            );
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "sources",
                sources,
              }) + "\n",
            ),
          );

          let fullAnswer = "";

          for await (const chunk of stream) {
            const text = normalizeChunkText(chunk);

            if (text) {
              fullAnswer += text;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "token",
                    content: text,
                  }) + "\n",
                ),
              );
            }
          }

          if (activeConversationId && fullAnswer.trim()) {
            try {
              await saveMessage(activeConversationId, "assistant", fullAnswer);
            } catch (err) {
              // Failed to save assistant message.
            }
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "done",
              }) + "\n",
            ),
          );

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                error: "Failed while streaming answer",
                details: error instanceof Error ? error.message : String(error),
              }) + "\n",
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (isOllamaModelNotFoundError(error)) {
      return Response.json(
        {
          error: "Chat model is not available",
          details: getMissingOllamaModelMessage(),
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error: "Failed to generate answer",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
