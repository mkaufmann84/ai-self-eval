export const RESPONSE_MODEL_VALUES = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-chat-latest",
  "chatgpt-4o-latest",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-3.5-turbo",
  "grok-4",
  "gemini-2.5-pro",
  "claude-opus-4-1-20250805",
  "claude-sonnet-4-5-20250929",
  "glm-4.6",
  "deepseek-v3.1",
  "qwen3-max",
] as const;

export type ResponseModelValue = (typeof RESPONSE_MODEL_VALUES)[number];

const RESPONSE_MODEL_LABELS: Record<ResponseModelValue, string> = {
  "gpt-5": "GPT-5",
  "gpt-5-mini": "GPT-5 mini",
  "gpt-5-chat-latest": "GPT-5 chat latest",
  "chatgpt-4o-latest": "ChatGPT-4o latest",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-3.5-turbo": "GPT-3.5 turbo",
  "grok-4": "Grok 4",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "claude-opus-4-1-20250805": "Claude Opus 4.1",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
  "glm-4.6": "GLM 4.6",
  "deepseek-v3.1": "DeepSeek V3.1",
  "qwen3-max": "Qwen3-Max",
};

export const RESPONSE_MODEL_OPTIONS: ReadonlyArray<{
  value: ResponseModelValue;
  label: string;
}> = RESPONSE_MODEL_VALUES.map((value) => ({
  value,
  label: RESPONSE_MODEL_LABELS[value],
}));

export const ANALYSIS_MODEL_VALUES = [
  ...RESPONSE_MODEL_VALUES,
  "skip",
] as const;

export type AnalysisModelValue = (typeof ANALYSIS_MODEL_VALUES)[number];

const ANALYSIS_MODEL_LABELS: Record<AnalysisModelValue, string> = {
  ...RESPONSE_MODEL_LABELS,
  skip: "Skip analysis",
};

export const ANALYSIS_MODEL_OPTIONS: ReadonlyArray<{
  value: AnalysisModelValue;
  label: string;
}> = ANALYSIS_MODEL_VALUES.map((value) => ({
  value,
  label: ANALYSIS_MODEL_LABELS[value],
}));
