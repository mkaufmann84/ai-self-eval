"use server";

import { cookies } from "next/headers";
import { COOKIES } from "@/constants";

export interface XAICompletionRequest {
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  conversation: {
    role: "user" | "assistant";
    content: string;
  }[];
}

const XAI_BASE_URL = process.env.XAI_BASE_URL ?? "https://api.x.ai";

export async function xaiComplete({
  model,
  system,
  temperature,
  maxTokens,
  conversation,
}: XAICompletionRequest): Promise<string> {
  const apiKey = cookies().get(COOKIES.XAI_API_KEY)?.value;
  if (!apiKey) {
    throw new Error(
      "Missing xAI API key. Store it on the settings page before using Grok models."
    );
  }

  const messages = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    ...conversation,
  ];

  const response = await fetch(`${XAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}