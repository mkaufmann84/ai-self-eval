export type Role = "user" | "assistant";

export interface RunTurn {
  role: Role;
  content: string;
  model?: string;
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
