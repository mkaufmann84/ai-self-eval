import { ResponseModelValue } from "./model-options";

export interface ModelConfig {
  response_model: ResponseModelValue;
  num_responses: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  models: ModelConfig[];
  defaultResponseTemperature?: number;
  defaultAnalysisTemperature?: number;
}

export const PRESETS: Preset[] = [
  {
    id: "default",
    name: "Standard Evaluation",
    description:
      "Compare top chat models: GPT-5 Chat, ChatGPT-4o latest, Claude Opus, Grok 4, Gemini 2.5 Pro",
    models: [
      { response_model: "gpt-5-chat-latest", num_responses: 2 },
      { response_model: "chatgpt-4o-latest", num_responses: 2 },
      { response_model: "claude-opus-4-1-20250805", num_responses: 2 },
      { response_model: "grok-4", num_responses: 2 },
      { response_model: "gemini-2.5-pro", num_responses: 2 },
    ],
    defaultResponseTemperature: 1.2,
    defaultAnalysisTemperature: 0.0,
  },
];
