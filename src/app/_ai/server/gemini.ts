"use server";

import { cookies } from "next/headers";

import { COOKIES } from "@/constants";
import {
  performGeminiCompletion,
  type GeminiCompletionParams,
  type GeminiConversationTurn,
} from "@/lib/providers/gemini";

export interface GeminiCompletionRequest {
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  conversation: GeminiConversationTurn[];
}

export async function geminiComplete(
  params: GeminiCompletionRequest
): Promise<string> {
  const apiKey = cookies().get(COOKIES.GEMINI_API_KEY)?.value;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Store it on the settings page before using Gemini models."
    );
  }

  const completionParams: GeminiCompletionParams = {
    apiKey,
    ...params,
  };

  return performGeminiCompletion(completionParams);
}
