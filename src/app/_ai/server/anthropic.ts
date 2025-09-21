"use server";

import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";

import { COOKIES } from "@/constants";

export interface AnthropicCompletionRequest {
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  conversation: {
    role: "user" | "assistant";
    content: string;
  }[];
}

export async function anthropicComplete({
  model,
  system,
  temperature,
  maxTokens,
  conversation,
}: AnthropicCompletionRequest): Promise<string> {
  const apiKey = cookies().get(COOKIES.ANTHROPIC_API_KEY)?.value;
  if (!apiKey) {
    throw new Error(
      "Missing Anthropic API key. Store it on the settings page before using Claude models."
    );
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    system,
    temperature,
    max_tokens: maxTokens ?? 1024,
    messages: conversation.map((turn) => ({
      role: turn.role,
      content: [{ type: "text", text: turn.content }],
    })),
  });

  return response.content
    .flatMap((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}
