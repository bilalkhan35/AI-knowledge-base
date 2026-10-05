import { NextResponse } from "next/server";
import {
  createConversation,
  deleteConversation,
  getUserConversations,
  getConversationMessages,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const documentId = searchParams.get("documentId") || undefined;
    const conversationId = searchParams.get("conversationId");

    // If direct conversationId requested, return its messages
    if (conversationId?.trim()) {
      const messages = await getConversationMessages(conversationId.trim());
      return NextResponse.json(messages);
    }

    if (!userId?.trim()) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const conversations = await getUserConversations(
      userId.trim(),
      documentId?.trim(),
    );

    // Fetch messages of the latest conversation so frontend gets both in one shot
    let messages: Array<Record<string, unknown>> = [];
    if (conversations && conversations.length > 0) {
      messages = await getConversationMessages(conversations[0].id);
    }

    return NextResponse.json({
      conversations,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load conversations",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId?.trim()) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const deletedConversation = await deleteConversation(conversationId.trim());

    return NextResponse.json({
      success: true,
      deletedConversation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete conversation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, documentId, title } = await request.json();

    if (!userId?.trim()) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!documentId?.trim()) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 },
      );
    }

    const conversation = await createConversation(
      userId.trim(),
      documentId.trim(),
      title?.trim() || "New Chat",
    );

    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create conversation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
