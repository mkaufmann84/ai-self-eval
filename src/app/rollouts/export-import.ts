import type { ConversationRun } from "./definitions";
import { turnsEqual } from "./utils";

export interface ConvoTreeExport {
  version: string;
  exportedAt: string;
  rootKey: string;
  runs: ConversationRun[];
}

/**
 * Exports conversation runs to JSON format
 */
export function exportToJSON(
  runs: ConversationRun[],
  rootKey: string
): string {
  const exportData: ConvoTreeExport = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    rootKey,
    runs,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Imports conversation runs from JSON, merging with existing runs
 * Returns only new runs that don't already exist
 */
export function importFromJSON(
  jsonString: string,
  existingRuns: ConversationRun[]
): ConversationRun[] {
  try {
    const parsed = JSON.parse(jsonString) as ConvoTreeExport;

    // Validate format
    if (!parsed.version || !parsed.runs || !Array.isArray(parsed.runs)) {
      throw new Error("Invalid export format");
    }

    // Validate each run has required fields
    for (const run of parsed.runs) {
      if (!run.id || !Array.isArray(run.turns)) {
        throw new Error("Invalid run format");
      }
      for (const turn of run.turns) {
        if (!turn.role || !turn.content) {
          throw new Error("Invalid turn format");
        }
      }
    }

    // Filter out runs that already exist (by comparing turn sequences)
    const newRuns = parsed.runs.filter((importedRun) => {
      return !existingRuns.some((existingRun) =>
        turnsEqual(existingRun.turns, importedRun.turns)
      );
    });

    return newRuns;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import: ${error.message}`);
    }
    throw new Error("Failed to import: Unknown error");
  }
}

/**
 * Triggers a download of the JSON content
 */
export function downloadJSON(jsonString: string, filename?: string): void {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename ?? `convotree-export-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads a file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
