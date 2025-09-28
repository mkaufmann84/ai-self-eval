export const RESPONSE_MODEL_VALUES = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-chat-latest",
  "chatgpt-4o-latest",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "claude-4-sonnet-20241022",
  "claude-4-opus-20241022",
] as const;

export type ResponseModelValue = (typeof RESPONSE_MODEL_VALUES)[number];

const RESPONSE_MODEL_LABELS: Record<ResponseModelValue, string> = {
  "gpt-5": "GPT-5",
  "gpt-5-mini": "GPT-5 mini",
  "gpt-5-chat-latest": "GPT-5 chat latest",
  "chatgpt-4o-latest": "ChatGPT-4o latest",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-4-turbo": "GPT-4 turbo",
  "gpt-3.5-turbo": "GPT-3.5 turbo",
  "claude-4-sonnet-20241022": "Claude 4 Sonnet (2024-10-22)",
  "claude-4-opus-20241022": "Claude 4 Opus (2024-10-22)",
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
