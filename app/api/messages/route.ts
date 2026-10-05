import { NextResponse } from "next/server";
import { getConversationMessages } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId?.trim()) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const messages = await getConversationMessages(conversationId.trim());
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load messages",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
