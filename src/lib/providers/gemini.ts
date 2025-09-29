import { randomUUID } from "crypto";

export interface GeminiConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GeminiCompletionParams {
  apiKey: string;
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  conversation: GeminiConversationTurn[];
}

interface GeminiContentEntry {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";

export async function performGeminiCompletion({
  apiKey,
  model,
  system,
  temperature,
  maxTokens,
  conversation,
}: GeminiCompletionParams): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Store it on the settings page before using Gemini models."
    );
  }

  if (!model || !model.includes("gemini")) {
    throw new Error(
      `Invalid Gemini model: "${model}". Expected a model name containing "gemini".`
    );
  }

  const contents = conversation
    .map<GeminiContentEntry | null>((turn, index) => {
      if (!turn.content || turn.content.trim().length === 0) {
        console.warn(`Skipping empty Gemini message at index ${index}`);
        return null;
      }

      return {
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content.trim() }],
      };
    })
    .filter((entry): entry is GeminiContentEntry => entry !== null);

  while (contents.length > 0 && contents[contents.length - 1].role === "model") {
    console.warn("Removing trailing model message to comply with Gemini requirements");
    contents.pop();
  }

  if (contents.length === 0) {
    throw new Error(
      "Gemini conversation is empty. Provide at least one user message with non-empty content."
    );
  }

  const url = `${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: temperature ?? 0.7,
        maxOutputTokens: maxTokens ?? 4096,
        candidateCount: 1,
      },
    };

    const uniqueId = randomUUID();
    const systemWithId = system
      ? `${system}\n\n[Request ID: ${uniqueId}]`
      : `[Request ID: ${uniqueId}]`;

    requestBody.systemInstruction = {
      parts: [{ text: systemWithId }],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error response (${response.status}):`, errorText);

      let errorMessage = `Gemini API error (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        if (response.status === 400) {
          errorMessage += ". Check that your API key has access to the Gemini 2.5 Pro model.";
        } else if (response.status === 429) {
          errorMessage += ". You've hit the rate limit. Please wait and retry.";
        } else if (response.status === 403) {
          errorMessage += ". Your API key may not have permission for this model or region.";
        }
      } catch {
        errorMessage += `: ${errorText.substring(0, 500)}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      console.error("Unexpected Gemini response structure:", JSON.stringify(data));

      if (data.promptFeedback) {
        const feedback = data.promptFeedback;
        if (feedback.blockReason) {
          throw new Error(
            `Prompt blocked by Gemini. Reason: ${feedback.blockReason}. ` +
              `Safety ratings: ${JSON.stringify(feedback.safetyRatings || [])}`
          );
        }
      }

      throw new Error(
        "Invalid response from Gemini API: No candidates generated. " +
          "This may indicate the prompt was filtered or the model is unavailable."
      );
    }

    const candidate = data.candidates[0];

    if (candidate.finishReason === "SAFETY") {
      const safetyRatings = candidate.safetyRatings || [];
      const details = safetyRatings.map((r: any) => ({
        category: r.category,
        probability: r.probability,
        blocked: r.blocked,
      }));

      const blockedCategories = safetyRatings
        .filter((r: any) => r.blocked)
        .map((r: any) => r.category)
        .join(", ");

      console.error("Safety block details:", JSON.stringify(details));

      throw new Error(
        `Response blocked by Gemini safety filters.\n` +
          `Blocked categories: ${blockedCategories || "unspecified"}\n` +
          `Suggestion: Try rephrasing your prompt to be more neutral or professional.`
      );
    }

    if (candidate.finishReason === "RECITATION") {
      throw new Error(
        "Response blocked due to potential copyright recitation. " +
          "The model detected it might be reproducing copyrighted content."
      );
    }

    if (candidate.finishReason === "OTHER") {
      console.warn("Response finished with reason: OTHER. This is unusual.");
    }

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
        const tokenInfo = candidate.tokenCount
          ? ` (Used ${candidate.tokenCount} tokens)`
          : "";
        return `${text}\n\n[Note: Response was truncated at the token limit${tokenInfo}. Consider increasing maxTokens for longer responses.]`;
      }
      return text;
    }

    const debugInfo = {
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
      hasContent: !!candidate.content,
      hasOutput: !!candidate.output,
      hasText: !!candidate.text,
      candidateKeys: Object.keys(candidate),
    };

    console.error("Empty Gemini response debug info:", JSON.stringify(debugInfo));

    if (candidate.finishReason === "STOP" && !text) {
      throw new Error(
        "Gemini returned an empty response with STOP status. " +
          "This is a known issue with Gemini 2.5 Pro. " +
          "Try: 1) Adding a unique prefix to your prompt, 2) Retrying the request, " +
          "or 3) Switching to a different model temporarily."
      );
    }

    throw new Error(
      `No text content in Gemini response.\n` +
        `Finish reason: ${candidate.finishReason || "unknown"}\n` +
        `Debug: ${JSON.stringify(debugInfo, null, 2)}`
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        error.message += "\n\nSuggestion: Wait 60 seconds before retrying.";
      } else if (error.message.includes("fetch failed") || error.message.includes("ECONNRESET")) {
        error.message = `Network error connecting to Gemini API: ${error.message}\n\nSuggestion: Check your internet connection and retry.`;
      } else if (error.message.includes("API key")) {
        error.message += "\n\nSuggestion: Verify your API key in Settings and ensure it has Gemini API access enabled.";
      }
    }

    console.error("Gemini API call failed with enhanced context:", error);
    throw error;
  }
}
