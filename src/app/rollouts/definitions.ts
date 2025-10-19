export type Role = "user" | "assistant";

export interface RunTurn {
  role: Role;
  content: string;
  model?: string;
  cutoffIndex?: number; // Character index where rollout branching occurred
}

export interface ConversationRun {
  id: string;
  turns: RunTurn[];
}

export interface ConversationOption {
  id: string;
  content: string;
  runIds: string[];
  models: string[];
  nextPrefix: string;
  isRollout?: boolean; // True if this option was created via rollout
  parentContent?: string; // The prefix text before the rollout cutoff
}

export interface ConversationNode {
  id: string;
  depth: number;
  role: Role;
  prefixKey: string;
  options: ConversationOption[];
}

export interface ConversationTree {
  nodesById: Record<string, ConversationNode>;
  layers: ConversationNode[][];
  rootKey: string;
  maxDepth: number;
}

export interface PathStep {
  node: ConversationNode;
  selectedOption: ConversationOption | null;
}

export const ROOT_KEY = "root";
