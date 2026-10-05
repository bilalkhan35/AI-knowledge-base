import { supabase } from "./supabase";

export async function createConversation(
  userId: string,
  documentId: string,
  title = "New Chat",
) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      document_id: documentId,
      title,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data;
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return data;
}

export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load conversation messages: ${error.message}`);
  }

  return data;
}

export async function getUserConversations(
  userId: string,
  documentId?: string,
) {
  let query = supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load user conversations: ${error.message}`);
  }

  return data;
}

export async function getConversation(conversationId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  return data;
}

export async function deleteConversation(conversationId: string) {
  const { error: messageError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (messageError) {
    throw new Error(
      `Failed to delete conversation messages: ${messageError.message}`,
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }

  return data;
}
