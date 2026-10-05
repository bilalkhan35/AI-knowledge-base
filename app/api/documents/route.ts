import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type DocumentRow = {
  document_id: string;
  file_name: string;
};

type ConversationSummary = {
  id: string;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("document_chunks")
      .select("document_id, file_name")
      .not("document_id", "is", null)
      .not("file_name", "is", null)
      .order("document_id");

    if (error) {
      throw new Error(error.message);
    }

    const documents = Array.from(
      new Map(
        (data as DocumentRow[] | null | undefined)?.map((row: DocumentRow) => [
          row.document_id,
          {
            documentId: row.document_id,
            fileName: row.file_name,
          },
        ]) ?? [],
      ).values(),
    );

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load documents",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { documentId } = await request.json();

    if (!documentId?.trim()) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

    const id = documentId.trim();

    // 1. Find conversations belonging to this document
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id")
      .eq("document_id", id);

    if (conversationsError) {
      throw new Error(
        `Failed to find conversations: ${conversationsError.message}`,
      );
    }

    const conversationIds =
      (conversations as ConversationSummary[] | null | undefined)?.map(
        (conversation: ConversationSummary) => conversation.id,
      ) ?? [];

    // 2. Delete messages first
    // messages reference conversations
    if (conversationIds.length > 0) {
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .in("conversation_id", conversationIds);

      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`);
      }
    }

    // 3. Delete conversations
    if (conversationIds.length > 0) {
      const { error: conversationsDeleteError } = await supabase
        .from("conversations")
        .delete()
        .eq("document_id", id);

      if (conversationsDeleteError) {
        throw new Error(
          `Failed to delete conversations: ${conversationsDeleteError.message}`,
        );
      }
    }

    // 4. Delete all RAG chunks / embeddings
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", id);

    if (chunksError) {
      throw new Error(
        `Failed to delete document chunks: ${chunksError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      documentId: id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete document",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
