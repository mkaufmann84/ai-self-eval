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
      "Compare top chat models: Qwen3-Max, Gemini 2.5 Pro, GPT-5 Chat, Grok 4, Sonnet 4.5, DeepSeek V3.1, GLM 4.6",
    models: [
      { response_model: "qwen3-max", num_responses: 1 },
      { response_model: "gemini-2.5-pro", num_responses: 1 },
      { response_model: "gpt-5-chat-latest", num_responses: 1 },
      { response_model: "grok-4", num_responses: 1 },
      { response_model: "claude-sonnet-4-5-20250929", num_responses: 1 },
      { response_model: "deepseek-v3.1", num_responses: 1 },
      { response_model: "glm-4.6", num_responses: 1 },
    ],
    defaultResponseTemperature: 1.0,
    defaultAnalysisTemperature: 0.0,
  },
];
