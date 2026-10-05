"use client";

import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { getOrCreateAnonymousUserId } from "@/lib/anonymousUser";

type DocumentItem = {
  documentId: string;
  fileName: string;
};

type Source = {
  pageContent: string;
  metadata?: {
    fileName?: string;
    documentId?: string;
    chunkIndex?: number;
    similarity?: number;
  };
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type StreamEvent = {
  type?: string;
  conversationId?: string;
  content?: unknown;
  sources?: unknown;
  error?: string;
  details?: string;
};

function normalizeStreamText(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map((item) => normalizeStreamText(item)).join("");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;

    if (Array.isArray(record.content)) {
      return record.content.map((item) => normalizeStreamText(item)).join("");
    }

    if (record.content && typeof record.content === "object") {
      return normalizeStreamText(record.content);
    }
  }

  return "";
}

function normalizeMessageList(
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
  }>,
) {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    sources: Array.isArray(msg.sources) ? msg.sources : [],
  }));
}

function TypingDots() {
  return (
    <div className="flex h-6 items-center gap-2" aria-label="Streaming answer">
      <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
      <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse delay-150" />
      <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse delay-300" />
    </div>
  );
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const [userId] = useState<string>(getOrCreateAnonymousUserId());
  const [conversationId, setConversationId] = useState<string>("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversations, setConversations] = useState<
    {
      id: string;
      title: string | null;
      created_at: string;
    }[]
  >([]);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const [uploadStatus, setUploadStatus] = useState("");
  const [openSources, setOpenSources] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load uploaded documents
  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents");

        if (!response.ok) {
          throw new Error("Failed to load documents");
        }

        const data = await response.json();

        setDocuments(data);
      } catch (error) {
        // Failed to load documents
      }
    }

    loadDocuments();
  }, []);

  // Load existing conversation and messages when document or userId changes
  useEffect(() => {
    if (!selectedDocumentId || !userId) {
      return;
    }

    let isMounted = true;

    async function loadConversationHistory() {
      setLoadingHistory(true);
      try {
        const response = await fetch(
          `/api/conversations?userId=${encodeURIComponent(userId)}&documentId=${encodeURIComponent(selectedDocumentId)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load conversations");
        }

        const data = await response.json();

        if (!isMounted) return;

        const convList = Array.isArray(data)
          ? data
          : Array.isArray(data?.conversations)
            ? data.conversations
            : [];
        setConversations(convList);
        const initialMsgs = Array.isArray(data?.messages)
          ? data.messages
          : null;

        if (convList.length > 0) {
          const latestConversation = convList[0];
          setConversationId(latestConversation.id);

          if (initialMsgs !== null) {
            setMessages(normalizeMessageList(initialMsgs));
          } else {
            // Fallback to flat /api/messages route if needed
            const messagesResponse = await fetch(
              `/api/messages?conversationId=${encodeURIComponent(latestConversation.id)}`,
            );

            if (messagesResponse.ok) {
              const savedMessages = await messagesResponse.json();
              if (isMounted && Array.isArray(savedMessages)) {
                setMessages(normalizeMessageList(savedMessages));
              }
            }
          }
        } else {
          // No conversation yet for this document
          setConversationId("");
          setMessages([]);
        }
      } catch (error) {
        // Failed to load conversation history
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    }

    loadConversationHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedDocumentId, userId]);

  const handleNewChat = () => {
    setConversationId("");
    setMessages([]);
    setQuestion("");
    setOpenSources({});
  };

  const resetChatState = () => {
    setConversationId("");
    setMessages([]);
    setQuestion("");
    setConversations([]);
    setOpenSources({});
  };

  const handleSelectConversation = async (id: string) => {
    try {
      setLoadingHistory(true);

      const response = await fetch(
        `/api/conversations?conversationId=${encodeURIComponent(id)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load conversation");
      }

      const savedMessages = await response.json();

      setConversationId(id);
      setMessages(normalizeMessageList(savedMessages));
    } catch (error) {
      // Failed to load conversation
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteConversation = async (
    id: string,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();

    const confirmed = window.confirm("Delete this chat?");
    if (!confirmed) {
      return;
    }

    try {
      setLoadingHistory(true);

      const response = await fetch(
        `/api/conversations?conversationId=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete conversation");
      }

      setConversations((prev) =>
        prev.filter((conversation) => conversation.id !== id),
      );

      if (conversationId === id) {
        setConversationId("");
        setMessages([]);
        setQuestion("");
      }
    } catch (error) {
      // Failed to delete conversation
      alert("Unable to delete this chat.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSources = (messageIndex: number) => {
    setOpenSources((prev) => ({
      ...prev,
      [messageIndex]: !prev[messageIndex],
    }));
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!question.trim() || loading) return;

    if (!selectedDocumentId) {
      alert("Please select a document first.");
      return;
    }

    const userQuestion = question.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userQuestion,
      },
    ]);

    setQuestion("");
    setLoading(true);

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          documentId: selectedDocumentId,
          userId,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Something went wrong");
      }

      if (!response.body) {
        throw new Error("Response body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let answer = "";

      const updateAssistantMessage = (updates: Partial<Message>) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;

          if (lastIndex >= 0 && updated[lastIndex]?.role === "assistant") {
            updated[lastIndex] = {
              ...updated[lastIndex],
              ...updates,
            };
            return updated;
          }

          const nextMessage: Message = {
            role: "assistant",
            content: "",
            ...updates,
          };

          updated.push(nextMessage);
          return updated;
        });
      };

      const handleStreamEvent = (data: StreamEvent) => {
        if (
          data.type === "conversation" &&
          typeof data.conversationId === "string"
        ) {
          setConversationId(data.conversationId);
          return;
        }

        if (data.type === "sources") {
          updateAssistantMessage({
            sources: Array.isArray(data.sources) ? data.sources : [],
          });
          return;
        }

        if (data.type === "token") {
          const tokenText = normalizeStreamText(data.content);

          if (!tokenText) return;

          answer += tokenText;

          updateAssistantMessage({
            content: answer,
          });

          return;
        }

        if (data.type === "error") {
          throw new Error(data.details || data.error || "Stream failed");
        }
      };

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split("\n");

        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          handleStreamEvent(JSON.parse(line) as StreamEvent);
        }
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          if (line.trim()) {
            handleStreamEvent(JSON.parse(line) as StreamEvent);
          }
        }
      }

      if (!answer.trim()) {
        updateAssistantMessage({
          content: "I did not receive any answer text from the model.",
        });
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        if (lastIndex >= 0 && updated[lastIndex]?.role === "assistant") {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: "Sorry, something went wrong.",
          };
        }

        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadStatus(`Uploaded ${data.chunkCount} chunks`);

      // Refresh document list after upload
      const documentsResponse = await fetch("/api/documents");

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();

        setDocuments(documentsData);

        // Automatically select newly uploaded document
        if (data.documentId) {
          setSelectedDocumentId(data.documentId);
        }
      }

      event.target.value = "";

      setTimeout(() => setUploadStatus(""), 3000);
    } catch (error) {
      setUploadStatus(
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );

      setTimeout(() => setUploadStatus(""), 3000);
    }
  };
  const handleDeleteDocument = async (documentId: string) => {
    const document = documents.find((item) => item.documentId === documentId);

    if (!document) return;

    const confirmed = window.confirm(
      `Delete "${document.fileName}"?\n\nThis will also delete its chats and messages.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details || data.error || "Failed to delete document",
        );
      }

      // Remove document from selector
      setDocuments((current) =>
        current.filter((item) => item.documentId !== documentId),
      );

      // If currently selected, clear the chat
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId("");
        setConversationId("");
        setMessages([]);
        setConversations([]);
      }

      setUploadStatus(`Deleted "${document.fileName}"`);
    } catch (error) {
      setUploadStatus(
        `Delete failed: ${
          error instanceof Error ? error.message : "Failed to delete document"
        }`,
      );
    }
  };

  const isStatusError = /failed|error|unable/i.test(uploadStatus);

  return (
    <div className="flex h-dvh min-h-screen flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">
                Knowledge Base AI
              </h1>

              <p className="text-sm text-slate-400 mt-1">
                Chat with your documents
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Document selector */}
              <select
                value={selectedDocumentId}
                onChange={(e) => setSelectedDocumentId(e.target.value)}
                disabled={loading}
                className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-neutral-900 px-3 text-sm text-white outline-none transition-colors focus:border-cyan-400 sm:max-w-72 lg:w-72 lg:flex-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select document</option>

                {documents.map((document) => (
                  <option key={document.documentId} value={document.documentId}>
                    {document.fileName}
                  </option>
                ))}
              </select>

              {selectedDocumentId && (
                <button
                  type="button"
                  onClick={() => handleDeleteDocument(selectedDocumentId)}
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Delete selected document"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M3 7h18m-5 0V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3"
                    />
                  </svg>
                  Delete
                </button>
              )}

              {/* New Chat button */}
              {selectedDocumentId && (
                <button
                  type="button"
                  onClick={handleNewChat}
                  disabled={loading}
                  className="h-10 rounded-lg border border-white/10 bg-neutral-900 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  title="Start a new chat for this document"
                >
                  + New Chat
                </button>
              )}

              {/* Upload */}
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/60 hover:bg-cyan-400/15">
                <svg
                  className="h-5 w-5 text-cyan-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>

                <span className="text-sm font-medium">Upload PDF</span>

                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>

              {uploadStatus && (
                <span
                  className={`max-w-full truncate text-sm ${
                    isStatusError ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {uploadStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 w-full flex-1 overflow-hidden">
        {/* Chat Sidebar */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-neutral-950/80 lg:block">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
              Chats
            </h2>

            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500">No previous chats</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-2 rounded-lg border transition-colors ${
                      conversation.id === conversationId
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                        : "border-transparent text-slate-300 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className="flex-1 text-left px-3 py-2 rounded-lg text-sm cursor-pointer"
                    >
                      <div className="truncate">
                        {conversation.title || "New Chat"}
                      </div>

                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(conversation.created_at).toLocaleDateString()}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(event) =>
                        handleDeleteConversation(conversation.id, event)
                      }
                      aria-label={`Delete ${conversation.title || "chat"}`}
                      className="mr-2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-neutral-800 hover:text-red-300"
                      title="Delete chat"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        {loadingHistory ? (
          <div className="flex h-full flex-1 items-center justify-center">
            <div className="flex items-center gap-3 text-slate-400">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span>Loading chat history...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full w-full flex-1 items-start justify-start overflow-y-auto p-6 sm:p-10 md:p-16">
            <div className="max-w-xl text-left">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
                <svg
                  className="h-8 w-8 text-cyan-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">
                Start asking questions
              </h2>

              <p className="text-slate-400">
                Select a PDF and ask anything about it
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <div
                  className={`mb-4 ${
                    message.role === "user" ? "ml-auto mr-0" : "ml-0 mr-auto"
                  } max-w-[92%] sm:max-w-[85%]`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 sm:px-6 sm:py-4 ${
                      message.role === "user"
                        ? "bg-cyan-600"
                        : "border border-white/10 bg-neutral-900"
                    }`}
                  >
                    {message.role === "assistant" &&
                    loading &&
                    index === messages.length - 1 &&
                    !message.content ? (
                      <TypingDots />
                    ) : (
                      <p className="text-white whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>

                {message.role === "assistant" && message.sources?.length ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleSources(index)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-900/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-white"
                    >
                      <span>Sources</span>

                      <svg
                        className={`h-4 w-4 transition-transform ${
                          openSources[index] ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {openSources[index] && (
                      <div className="mt-3 space-y-2">
                        {message.sources.map(
                          (source: Source, sourceIndex: number) => {
                            const fileName =
                              source.metadata?.fileName ?? "Unknown source";

                            const chunkIndex =
                              source.metadata?.chunkIndex ?? sourceIndex + 1;

                            const similarity = source.metadata?.similarity ?? 0;

                            return (
                              <div
                                key={`${source.metadata?.documentId ?? "source"}-${chunkIndex}`}
                                className="rounded-xl border border-white/10 bg-neutral-900/70 p-4 transition-colors hover:border-cyan-400/40"
                              >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <span className="text-xs font-medium uppercase tracking-wide text-cyan-200">
                                    Source {sourceIndex + 1}
                                  </span>

                                  <span className="text-[11px] text-slate-400">
                                    {fileName}
                                  </span>
                                </div>

                                <p className="text-sm leading-6 text-slate-300 line-clamp-3">
                                  {source.pageContent}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                  <span>Chunk: {chunkIndex}</span>

                                  {source.metadata?.documentId && (
                                    <span>
                                      Doc: {source.metadata.documentId}
                                    </span>
                                  )}

                                  <span>
                                    Similarity: {(similarity * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <div className="sticky bottom-0 border-t border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                selectedDocumentId
                  ? "Ask a question about the selected document..."
                  : "Select a document first..."
              }
              disabled={!selectedDocumentId}
              className="min-h-12 flex-1 rounded-xl border border-white/10 bg-neutral-900 px-5 py-3 text-white transition-colors placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={loading || !question.trim() || !selectedDocumentId}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-white" />
                  Thinking...
                </>
              ) : (
                <>
                  <span>Send</span>

                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
