"use client";

import OpenAI from "openai";
import Cookies from "js-cookie";
import { z } from "zod";
import { COOKIES } from "@/constants";
import { anthropicComplete } from "./server/anthropic";
import { xaiComplete } from "./server/xai";

import { apiPath } from "@/lib/base-path";

const normalizedTemperature = (model: string, temperature: number) =>
  model.startsWith("gpt-5") ? 1 : temperature;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Provider = "openai" | "anthropic" | "xai" | "gemini";

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface StreamResult {
  textStream: AsyncIterable<string>;
}

const OPENAI_BROWSER_OPTIONS = { dangerouslyAllowBrowser: true } as const;

let cachedOpenAIClient: { apiKey: string; client: OpenAI } | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = Cookies.get(COOKIES.OPENAI_API_KEY) ?? "";
  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Store it on the settings page first.");
  }
  if (!cachedOpenAIClient || cachedOpenAIClient.apiKey !== apiKey) {
    cachedOpenAIClient = {
      apiKey,
      client: new OpenAI({ apiKey, ...OPENAI_BROWSER_OPTIONS }),
    };
  }
  return cachedOpenAIClient.client;
}

function resolveProvider(model: string): Provider {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("grok")) return "xai";
  if (model.startsWith("gemini")) return "gemini";
  return "openai";
}

function splitSystemMessages(messages: ChatMessage[]): {
  system?: string;
  conversation: ConversationTurn[];
} {
  const systemParts: string[] = [];
  const conversation: ConversationTurn[] = [];

  messages.forEach((message, index) => {
    if (!message || !message.role) {
      throw new Error(`Invalid message at index ${index}`);
    }
    if (message.role === "system") {
      if (message.content.trim()) {
        systemParts.push(message.content.trim());
      }
      return;
    }
    if (message.role !== "user" && message.role !== "assistant") {
      throw new Error(`Unsupported role: ${message.role}`);
    }
    conversation.push({
      role: message.role,
      content: message.content,
    });
  });

  return {
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    conversation,
  };
}

async function completeWithOpenAI({
  model,
  messages,
  temperature,
  maxTokens,
}: ChatCompletionParams): Promise<string> {
  const client = getOpenAIClient();
  const { system, conversation } = splitSystemMessages(messages);
  const payload = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...conversation.map((turn) => ({ role: turn.role, content: turn.content })),
  ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: payload,
  });

  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

async function completeWithAnthropic({
  model,
  messages,
  temperature,
  maxTokens,
}: ChatCompletionParams): Promise<string> {
  const { system, conversation } = splitSystemMessages(messages);
  return anthropicComplete({
    model,
    system,
    temperature,
    maxTokens,
    conversation,
  });
}

async function completeWithXAI({
  model,
  messages,
  temperature,
  maxTokens,
}: ChatCompletionParams): Promise<string> {
  const { system, conversation } = splitSystemMessages(messages);
  return xaiComplete({
    model,
    system,
    temperature,
    maxTokens,
    conversation,
  });
}

async function completeWithGemini({
  model,
  messages,
  temperature,
  maxTokens,
}: ChatCompletionParams): Promise<string> {
  const { system, conversation } = splitSystemMessages(messages);
  const apiKey = Cookies.get(COOKIES.GEMINI_API_KEY);

  if (!apiKey) {
    throw new Error("Missing Gemini API key. Store it on the settings page before using Gemini models.");
  }

  try {
    const response = await fetch(apiPath("/api/ai/gemini"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gemini-API-Key": apiKey,
      },
      body: JSON.stringify({
        model,
        system,
        temperature,
        maxTokens,
        conversation,
      }),
    });

    let payload: { ok?: boolean; text?: string; error?: string } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.ok || typeof payload.text !== "string") {
      const message =
        payload?.error ?? `Gemini completion failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload.text;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Gemini completion failed for an unknown reason.");
  }
}

export async function generateChatCompletion(params: ChatCompletionParams): Promise<string> {
  const provider = resolveProvider(params.model);
  switch (provider) {
    case "openai":
      return completeWithOpenAI(params);
    case "anthropic":
      return completeWithAnthropic(params);
    case "xai":
      return completeWithXAI(params);
    case "gemini":
      return completeWithGemini(params);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function streamChatCompletion(
  params: ChatCompletionParams
): Promise<StreamResult> {
  const provider = resolveProvider(params.model);
  if (provider === "openai") {
    const client = getOpenAIClient();
    const { system, conversation } = splitSystemMessages(params.messages);
    const payload = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...conversation.map((turn) => ({ role: turn.role, content: turn.content })),
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    const stream = await client.chat.completions.create({
      model: params.model,
      messages: payload,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: true,
    });

    const iterator = (async function* () {
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (!delta) {
          continue;
        }
        if (Array.isArray(delta)) {
          for (const part of delta) {
            if (part) {
              yield part;
            }
          }
        } else {
          yield delta;
        }
      }
    })();

    return { textStream: iterator };
  }

  // Non-OpenAI providers require a different surface. Until we wire up their
  // event streams, fall back to a single completion emitted as one chunk so the
  // rest of the UI can keep polling the same interface.
  let text: string;
  switch (provider) {
    case "anthropic":
      text = await completeWithAnthropic(params);
      break;
    case "xai":
      text = await completeWithXAI(params);
      break;
    case "gemini":
      text = await completeWithGemini(params);
      break;
    default:
      throw new Error(`Unsupported provider for streaming: ${provider}`);
  }

  const iterator = (async function* () {
    if (text) {
      yield text;
    }
  })();
  return { textStream: iterator };
}

export function evalCriteriaMessages(input_prompt: string) {
  const formatted = `
  Your task is to create an evaluation criteria or a rubric that grades a response based on an input prompt.
  The critera will be used to grade a response on a scale of 0-100. You should be a very harsh grader. You should focus on what they did wrong.

  **The evaluation criteria is based on how well a response could answer the input prompt**

  Input prompt: 
  ${input_prompt}

  Evaluation Criteria (Rubric) for how well a response could answer the input prompt:
  `;
  const messages: ChatMessage[] = [
    { role: "user", content: formatted },
  ];
  return messages;
}

export function evalStepsMessages(prompt: string, eval_criteria: string) {
  const formatted = `
  Your task is to create guiding steps in evaluating responses based on input propmt.
  You are to use the input prompt, and evaluation criteria to create these steps.
  **The evaluation criteria is based on how well a response could answer the input prompt**

  Input prompt: 
  ${prompt}

  Evaluation Criteria for a response:
  ${eval_criteria}
  
  Evaluation Steps :`;
  const messages: ChatMessage[] = [
    { role: "user", content: formatted },
  ];
  return messages;
}

export function promptSystemAnalysis(rubric: string) {
  const formatted = `Your task is to analyze on an input text using a rubric.
    You will receive a rubric to guide you. You must use the rubric.
    The rubric contains a criteria and steps you can use to evaluate the criteria.
    You are to be a harsh grader. Prioritize accuracy, logical consistency, clarity, understandability in your analysis.

    Please make sure you read and understand these instructions carefully. Please keep this document open while reviewing, and refer to it as needed.

    Rubric:
    ${rubric}
    `;
  return formatted;
}
export function messageScore(
  prev_messages: ChatMessage[],
  analysis: string
) {
  const messages: ChatMessage[] = [
    ...prev_messages,
    { role: "assistant", content: analysis },
    {
      role: "system",
      content: `Using the analysis you just did, return a JSON response that scores the input text on a scale of 0-100.
      To format, you should use the key "score" to represent the score.`,
    },
  ];
  return messages;
}

export async function createRubric(
  input_prompt: string,
  model: string,
  analysis_temperature: number
) {
  if (model === "skip") {
    return "";
  }
  const safeTemperature = normalizedTemperature(model, analysis_temperature);
  const evalCriteriaText = await generateChatCompletion({
    model,
    messages: evalCriteriaMessages(input_prompt),
    temperature: safeTemperature,
  });
  const evalStepsText = await generateChatCompletion({
    model,
    messages: evalStepsMessages(input_prompt, evalCriteriaText ?? ""),
    temperature: safeTemperature,
  });
  const formatted = `Evaluation Criteria:
  ${evalCriteriaText ?? ""}
  
  Evaluation Steps:
  ${evalStepsText ?? ""}
  `;
  return formatted;
}

export function validateAndConvert(input: string): number {
  const numberSchema = z.preprocess((input) => {
    const num = parseFloat(input as any);
    return isNaN(num) ? NaN : Math.round(num);
  }, z.number().int().min(0).max(100));
  try {
    return numberSchema.parse(input);
  } catch (error) {
    return 0;
  }
}
