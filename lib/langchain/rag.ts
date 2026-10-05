import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableLambda,
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";

import { SupabaseRetriever } from "./retriever";
import { ragPrompt } from "./prompts";
import { llm } from "./llm";
import { multiQueryRetrieve } from "./../multiQueryRetriever";
import { rerankDocuments } from "./reranker";
import { buildContext } from "./contextChain";

const parser = new StringOutputParser();

const retrievalRunnable = RunnableLambda.from(
  async ({
    question,
    documentId,
  }: {
    question: string;
    documentId?: string;
  }) => {
    const documents = await multiQueryRetrieve(question, documentId);

    const rerankedDocuments = await rerankDocuments(question, documents, 5);

    return {
      question,
      context: buildContext(rerankedDocuments),
      documents: rerankedDocuments,
    };
  },
);

const chain = RunnableSequence.from([
  retrievalRunnable,

  RunnablePassthrough.assign({
    promptInput: async (input) => ({
      question: input.question,
      context: input.context,
    }),
  }),

  async ({ promptInput, documents, context }) => ({
    messages: await ragPrompt.invoke(promptInput),
    documents,
    context,
  }),

  async ({ messages, documents, context }) => ({
    answer: await llm.pipe(parser).invoke(messages),
    documents,
    context,
  }),
]);

export const ragChain = {
  async invoke(question: string, documentId?: string) {
    const result = await chain.invoke({
      question,
      documentId,
    });

    return {
      answer: result.answer,
      sources: result.documents,
      context: result.context,
    };
  },

  async stream(question: string, documentId?: string) {
    const documents = await multiQueryRetrieve(question, documentId);

    const rerankedDocuments = await rerankDocuments(question, documents, 5);

    const context = buildContext(rerankedDocuments);

    const messages = await ragPrompt.invoke({
      question,
      context,
    });

    const stream = await llm.pipe(parser).stream(messages);

    return {
      stream,
      sources: rerankedDocuments,
    };
  },
};
