"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useTheme } from "next-themes";

// Sample data - simulating a node with multiple response options
const sampleOptions = [
  {
    id: "opt1",
    content:
      "It succeeds because the latch transfers the load into the frame, which distributes stress evenly.",
    model: "chatgpt-4o-latest",
    score: 85,
    analysis:
      "**Strengths:** Clear explanation of the mechanism. Good use of technical terminology.\n\n**Weaknesses:** Could provide more detail about the frame structure.\n\n**Score: 85/100** - Strong response with room for elaboration.",
  },
  {
    id: "opt2",
    content:
      "The mechanism relies on counterbalancing forces; once they align, the motion feels effortless.",
    model: "gpt-4o-mini",
    score: 72,
    analysis:
      "**Strengths:** Mentions counterbalancing forces concept.\n\n**Weaknesses:** Vague explanation, doesn't directly address the frame distribution question. Uses subjective language ('feels effortless').\n\n**Score: 72/100** - Adequate but lacks precision.",
  },
  {
    id: "opt3",
    content:
      "It functions because the latch seats flush against the base, creating a compression seal that resists slipping.",
    model: "gpt-4o-mini",
    score: 78,
    analysis:
      "**Strengths:** Specific mechanical description with compression seal concept.\n\n**Weaknesses:** Focuses on different aspect than frame distribution. Slightly off-topic.\n\n**Score: 78/100** - Good technical detail but partial answer.",
  },
  {
    id: "opt4",
    content:
      "The load distribution works through a triangulated support system where each connection point shares approximately 33% of the total force, preventing any single point from becoming a failure node.",
    model: "gpt-5-chat-latest",
    score: 92,
    analysis:
      "**Strengths:** Highly specific with quantitative detail. Explains the distribution mechanism clearly. Addresses failure prevention.\n\n**Weaknesses:** Minor - could briefly mention the frame itself.\n\n**Score: 92/100** - Excellent technical response with precision.",
  },
];

const rubricText = `# Evaluation Rubric

## Criteria

### Technical Accuracy (40 points)
- Does the response correctly explain the load distribution mechanism?
- Are technical terms used appropriately?

### Clarity (30 points)
- Is the explanation easy to understand?
- Does it directly address the question asked?

### Completeness (20 points)
- Does it cover the key aspects of frame distribution?
- Are important details included?

### Specificity (10 points)
- Does it provide concrete examples or quantitative details?
- Avoids vague language?

## Scoring
- 90-100: Exceptional - Accurate, clear, complete, and specific
- 75-89: Strong - Good coverage with minor gaps
- 60-74: Adequate - Acceptable but lacks depth or clarity
- Below 60: Needs improvement`;

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

export default function InlineEvaluatorTest() {
  const [showRubric, setShowRubric] = useState(false);
  const [selectedOption, setSelectedOption] = useState(sampleOptions[0].id);
  const { resolvedTheme } = useTheme();

  const selectedData = sampleOptions.find((opt) => opt.id === selectedOption);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Inline Option Evaluator</h1>
          <p className="text-muted-foreground">
            Evaluating 4 assistant responses to: &quot;Can you explain that frame
            distribution more plainly?&quot;
          </p>
        </div>
        <Link href="/test">
          <Button variant="outline">← Back to Tests</Button>
        </Link>
      </div>

      {/* Context */}
      <div className="border border-input rounded-lg p-4 bg-muted/30">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Previous turn (User)
        </div>
        <p className="text-sm">What is the reason this works?</p>
      </div>

      {/* Evaluation Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant={showRubric ? "default" : "outline"}
          onClick={() => setShowRubric(!showRubric)}
        >
          {showRubric ? "Hide Rubric" : "Show Rubric"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {sampleOptions.length} options evaluated
        </span>
      </div>

      {/* Rubric Panel */}
      {showRubric && (
        <div className="border border-input rounded-lg p-6 bg-card">
          <div
            className={`prose ${
              resolvedTheme === "light" ? "prose" : "prose-invert"
            } max-w-none`}
          >
            <ReactMarkdown>{rubricText}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Option Selector with Scores */}
      <div>
        <div className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
          Response Options (sorted by score)
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-4">
            {[...sampleOptions]
              .sort((a, b) => b.score - a.score)
              .map((option) => {
                const isActive = option.id === selectedOption;
                const color = calculateColor(option.score);
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
                    <div
                      className="absolute top-2 right-2 w-12 h-12 border-[2px] flex justify-center items-center rounded-full bg-card font-bold text-lg"
                      style={{ color, borderColor: color }}
                    >
                      {option.score}
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
                    <span className="text-xs text-muted-foreground whitespace-normal break-words">
                      {option.model}
                    </span>
                  </button>
                );
              })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Selected Option Detail */}
      {selectedData && (
        <div className="grid grid-cols-2 gap-6">
          {/* Response */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Response</h3>
              <div
                className="w-10 h-10 border-[2px] flex justify-center items-center rounded-full bg-card font-bold"
                style={{
                  color: calculateColor(selectedData.score),
                  borderColor: calculateColor(selectedData.score),
                }}
              >
                {selectedData.score}
              </div>
            </div>
            <div className="border border-input rounded-lg p-4 bg-card">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedData.content}
              </p>
              <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                Model: {selectedData.model}
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Analysis</h3>
            <div className="border border-input rounded-lg p-4 bg-card">
              <div
                className={`prose prose-sm ${
                  resolvedTheme === "light" ? "prose" : "prose-invert"
                } max-w-none`}
              >
                <ReactMarkdown>{selectedData.analysis}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline">Select This Option</Button>
        <Button variant="outline">Re-evaluate All</Button>
        <Button variant="outline">Export Results</Button>
      </div>
    </div>
  );
}
