"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useTheme } from "next-themes";
import type { ConversationOption } from "../definitions";

interface OptionEvaluation {
  optionId: string;
  score: number | null;
  analysis: string;
  isGenerating: boolean;
}

interface EvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ConversationOption[];
  evaluations: Map<string, OptionEvaluation>;
  rubric: string | null;
  isGeneratingRubric: boolean;
  onEvaluate: () => void;
  onSelectOption?: (option: ConversationOption) => void;
}

function calculateColor(value: number) {
  let r = (100 - value) * 2.0;
  let g = value * 2.0;
  let b = 0;

  r = Math.round(r);
  g = Math.round(g);

  let hexR = r.toString(16).padStart(2, "0");
  let hexG = g.toString(16).padStart(2, "0");
  let hexB = b.toString(16).padStart(2, "0");

  return `#${hexR}${hexG}${hexB}`;
}

export function EvaluationDialog({
  open,
  onOpenChange,
  options,
  evaluations,
  rubric,
  isGeneratingRubric,
  onEvaluate,
  onSelectOption,
}: EvaluationDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    options[0]?.id ?? null
  );
  const [showRubric, setShowRubric] = useState(false);
  const { resolvedTheme } = useTheme();

  const selectedData = selectedOption
    ? options.find((opt) => opt.id === selectedOption)
    : null;
  const selectedEval = selectedOption
    ? evaluations.get(selectedOption)
    : null;

  // Sort options by score
  const sortedOptions = [...options].sort((a, b) => {
    const evalA = evaluations.get(a.id);
    const evalB = evaluations.get(b.id);
    const scoreA = evalA?.score ?? -1;
    const scoreB = evalB?.score ?? -1;
    return scoreB - scoreA;
  });

  const hasAnyScores = Array.from(evaluations.values()).some(
    (evaluation) => evaluation.score !== null
  );
  const allScored = options.every((opt) => {
    const evaluation = evaluations.get(opt.id);
    return evaluation && evaluation.score !== null;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Evaluate Options</DialogTitle>
          <DialogDescription>
            Compare and score {options.length} response options for this turn
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onEvaluate}
              disabled={isGeneratingRubric || allScored}
              size="sm"
            >
              {isGeneratingRubric
                ? "Generating..."
                : allScored
                ? "All Scored"
                : hasAnyScores
                ? "Re-evaluate All"
                : "Evaluate All Options"}
            </Button>
            <Button
              variant={showRubric ? "default" : "outline"}
              onClick={() => setShowRubric(!showRubric)}
              disabled={!rubric && !isGeneratingRubric}
              size="sm"
            >
              {showRubric ? "Hide Rubric" : "Show Rubric"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {Array.from(evaluations.values()).filter((e) => e.score !== null).length} /{" "}
              {options.length} scored
            </span>
          </div>

          {/* Rubric Panel */}
          {showRubric && (
            <div className="border border-input rounded-lg p-4 bg-card max-h-64 overflow-auto">
              {isGeneratingRubric ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating rubric...
                </div>
              ) : rubric ? (
                <div
                  className={`prose prose-sm ${
                    resolvedTheme === "light" ? "prose" : "prose-invert"
                  } max-w-none`}
                >
                  <ReactMarkdown>{rubric}</ReactMarkdown>
                </div>
              ) : null}
            </div>
          )}

          {/* Option Selector with Scores */}
          <div>
            <div className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              Response Options {hasAnyScores && "(sorted by score)"}
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-4">
                {sortedOptions.map((option) => {
                  const isActive = option.id === selectedOption;
                  const evaluation = evaluations.get(option.id);
                  const score = evaluation?.score;
                  const color = score !== null && score !== undefined ? calculateColor(score) : undefined;

                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={cn(
                        "relative w-72 min-h-[140px] rounded-lg border px-4 py-3 text-left transition flex flex-col gap-2",
                        "bg-muted",
                        isActive
                          ? "border-primary text-primary ring-2 ring-primary"
                          : "border-input text-foreground hover:border-primary/60"
                      )}
                    >
                      {/* Score Badge */}
                      <div className="absolute top-2 right-2">
                        {evaluation?.isGenerating ? (
                          <div className="w-12 h-12 border-2 border-muted-foreground/30 flex justify-center items-center rounded-full bg-card">
                            <svg
                              className="animate-spin h-5 w-5"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </div>
                        ) : score !== null ? (
                          <div
                            className="w-12 h-12 border-[2px] flex justify-center items-center rounded-full bg-card font-bold text-lg"
                            style={{ color, borderColor: color }}
                          >
                            {score}
                          </div>
                        ) : (
                          <div className="w-12 h-12 border-2 border-dashed border-muted-foreground/30 flex justify-center items-center rounded-full bg-card text-xs text-muted-foreground">
                            --
                          </div>
                        )}
                      </div>

                      {/* Content Preview */}
                      <span
                        className="overflow-hidden text-left text-sm leading-snug flex-1 pr-14"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          whiteSpace: "normal",
                        }}
                      >
                        {option.content}
                      </span>

                      {/* Model */}
                      {option.models.length > 0 && (
                        <span className="text-xs text-muted-foreground whitespace-normal break-words">
                          {option.models.join(", ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Selected Option Detail */}
          {selectedData && (
            <div className="grid grid-cols-2 gap-4 min-h-0" style={{ height: '400px' }}>
              {/* Response */}
              <div className="flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Response</h3>
                  {selectedEval?.score !== null && selectedEval?.score !== undefined && (
                    <div
                      className="w-10 h-10 border-[2px] flex justify-center items-center rounded-full bg-card font-bold"
                      style={{
                        color: calculateColor(selectedEval.score),
                        borderColor: calculateColor(selectedEval.score),
                      }}
                    >
                      {selectedEval.score}
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1 border border-input rounded-lg p-4 bg-card min-h-0">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedData.content}
                  </p>
                  {selectedData.models.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                      Model: {selectedData.models.join(", ")}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Analysis */}
              <div className="flex flex-col gap-2 min-h-0">
                <h3 className="text-sm font-semibold">Analysis</h3>
                <ScrollArea className="flex-1 border border-input rounded-lg p-4 bg-card min-h-0">
                  {selectedEval?.isGenerating ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating analysis...
                    </div>
                  ) : selectedEval?.analysis ? (
                    <div
                      className={`prose prose-sm ${
                        resolvedTheme === "light" ? "prose" : "prose-invert"
                      } max-w-none`}
                    >
                      <ReactMarkdown>{selectedEval.analysis}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click &quot;Evaluate All Options&quot; to generate analysis
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {onSelectOption && selectedData && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onSelectOption(selectedData);
                  onOpenChange(false);
                }}
              >
                Select This Option
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
