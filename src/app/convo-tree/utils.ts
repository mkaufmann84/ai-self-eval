import type { Role, RunTurn } from "./definitions";

export const getNodeKey = (depth: number, prefix: string) => `${depth}-${prefix}`;

export function friendlyRoleLabel(role: Role) {
  return role === "user" ? "User" : "AI";
}

export function nextRole(role: Role): Role {
  return role === "user" ? "assistant" : "user";
}

export function generateRunId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function turnsEqual(a: RunTurn[], b: RunTurn[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((turn, index) => {
    const other = b[index];
    return turn.role === other.role && turn.content === other.content;
  });
}
