# Knowledge Base AI

A Next.js app for uploading PDF documents, embedding their content, and chatting with a selected document through a RAG pipeline.

## Run locally

```bash
npm run dev
```

Open http://localhost:3000 and upload a PDF from the chat screen.

## Required environment

Set the Supabase URL and service role key, plus any model provider variables used by the RAG chain:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=http://127.0.0.1:11434
EMBEDDING_MODEL=nomic-embed-text:latest
```

The app expects Supabase tables/functions for `document_chunks`, `conversations`, `messages`, `match_document_chunks`, and `keyword_search_document_chunks`.

## Useful scripts

```bash
npm run lint
npm run build
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
