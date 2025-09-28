"use server";

import { cookies } from "next/headers";
import { COOKIES } from "@/constants";

export interface GeminiCompletionRequest {
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  conversation: {
    role: "user" | "assistant";
    content: string;
  }[];
}

const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";

export async function geminiComplete({
  model,
  system,
  temperature,
  maxTokens,
  conversation,
}: GeminiCompletionRequest): Promise<string> {
  const apiKey = cookies().get(COOKIES.GEMINI_API_KEY)?.value;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Store it on the settings page before using Gemini models."
    );
  }

  // Convert conversation to Gemini format with model/user roles
  const contents = conversation
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    }))
    .filter((entry) => entry.parts[0]?.text?.length);

  // Gemini requires the final turn to be from the user
  while (contents.length > 0 && contents[contents.length - 1].role === "model") {
    contents.pop();
  }

  if (contents.length === 0) {
    throw new Error("Gemini conversation is empty. Provide at least one user message.");
  }

  const url = `${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: temperature ?? 0.7,
        maxOutputTokens: maxTokens ?? 4096,
        candidateCount: 1,
      },
    };

    // Add system instruction if present (proper field for Gemini)
    if (system) {
      requestBody.systemInstruction = {
        parts: [{ text: system }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error response: ${errorText}`);
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      console.error("Unexpected Gemini response structure:", JSON.stringify(data));
      throw new Error("Invalid response from Gemini API: No candidates");
    }

    const candidate = data.candidates[0];

    // Check for safety blocks
    if (candidate.finishReason === "SAFETY") {
      const safetyRatings = candidate.safetyRatings || [];
      const blockedCategories = safetyRatings
        .filter((r: any) => r.blocked)
        .map((r: any) => r.category)
        .join(", ");
      throw new Error(
        `Response blocked by safety filters. Categories: ${blockedCategories || "unspecified"}`
      );
    }

    // Handle multiple response formats
    const parts: string[] = [];

    const contentEntries = Array.isArray(candidate.content)
      ? candidate.content
      : candidate.content
      ? [candidate.content]
      : [];

    for (const entry of contentEntries) {
      if (entry?.parts && Array.isArray(entry.parts)) {
        for (const part of entry.parts) {
          if (typeof part?.text === "string") {
            parts.push(part.text);
          }
        }
      }
    }

    if (parts.length === 0 && typeof candidate.output === "string") {
      parts.push(candidate.output);
    }

    if (parts.length === 0 && typeof candidate.text === "string") {
      parts.push(candidate.text);
    }

    const text = parts.join("").trim();

    if (text) {
      if (candidate.finishReason === "MAX_TOKENS") {
        return `${text}\n\n[Gemini truncated the response after reaching the maximum token limit.]`;
      }
      return text;
    }

    console.error("No text found in Gemini response:", JSON.stringify(data));
    throw new Error(
      `No text content in Gemini response. Finish reason: ${candidate.finishReason || "unknown"}`
    );
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
}
