"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { useTheme } from "next-themes";

interface Turn {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

interface ConversationPath {
  id: string;
  name: string;
  turns: Turn[];
  score: number;
  analysis: string;
}

const samplePaths: ConversationPath[] = [
  {
    id: "path1",
    name: "Path A: Technical Depth",
    score: 88,
    turns: [
      { role: "user", content: "What is the reason this works?" },
      {
        role: "assistant",
        content:
          "It succeeds because the latch transfers the load into the frame, which distributes stress evenly.",
        model: "chatgpt-4o-latest",
      },
      {
        role: "user",
        content: "Can you explain that frame distribution more plainly?",
      },
      {
        role: "assistant",
        content:
          "The load distribution works through a triangulated support system where each connection point shares approximately 33% of the total force, preventing any single point from becoming a failure node.",
        model: "gpt-5-chat-latest",
      },
      { role: "user", content: "What happens if one point fails?" },
      {
        role: "assistant",
        content:
          "If one connection point fails, the remaining two points each absorb 50% of the load. The system remains stable but operates at reduced capacity until repaired.",
        model: "gpt-5-chat-latest",
      },
    ],
    analysis: `**Overall Assessment**

This conversation demonstrates strong technical depth with precise quantitative details. The assistant progressively builds understanding with specific percentages and failure scenarios.

**Strengths:**
- Highly specific technical explanations
- Good progressive disclosure of complexity
- Addresses edge cases (failure scenarios)
- Maintains consistency across turns

**Areas for Improvement:**
- Could use analogies for non-technical audiences
- Slightly dense for general understanding

**Score: 88/100** - Excellent for technical audiences`,
  },
  {
    id: "path2",
    name: "Path B: Analogy-Driven",
    score: 82,
    turns: [
      { role: "user", content: "What is the reason this works?" },
      {
        role: "assistant",
        content:
          "The mechanism relies on counterbalancing forces; once they align, the motion feels effortless.",
        model: "gpt-4o-mini",
      },
      {
        role: "user",
        content: "Can you explain that frame distribution more plainly?",
      },
      {
        role: "assistant",
        content:
          "Think of it like a playground seesaw—when each side carries the right amount of weight, the board glides smoothly.",
        model: "gpt-4o-mini",
      },
      { role: "user", content: "What happens if one point fails?" },
      {
        role: "assistant",
        content:
          "It's like removing one leg from a tripod—the structure becomes unstable and tips toward the weak side.",
        model: "gpt-4o-mini",
      },
    ],
    analysis: `**Overall Assessment**

This conversation uses accessible analogies to explain complex concepts. Good for general audiences but sacrifices technical precision.

**Strengths:**
- Highly accessible explanations
- Consistent use of relatable analogies
- Easy to visualize concepts
- Good conversation flow

**Areas for Improvement:**
- Lacks technical specificity
- Analogies don't always map perfectly to the actual mechanism
- May be too simplistic for technical users

**Score: 82/100** - Great for general audiences`,
  },
  {
    id: "path3",
    name: "Path C: Mixed Approach",
    score: 91,
    turns: [
      { role: "user", content: "What is the reason this works?" },
      {
        role: "assistant",
        content:
          "It succeeds because the latch transfers the load into the frame, which distributes stress evenly.",
        model: "chatgpt-4o-latest",
      },
      {
        role: "user",
        content: "Can you explain that frame distribution more plainly?",
      },
      {
        role: "assistant",
        content:
          "Imagine the frame as a loop of helpers—each helper takes a small portion of the weight so no one breaks a sweat. In this case, the load gets split roughly equally across three connection points.",
        model: "chatgpt-4o-latest",
      },
      { role: "user", content: "What happens if one point fails?" },
      {
        role: "assistant",
        content:
          "Like losing one helper from the team, the remaining two must work harder—each carrying 50% instead of 33%. The system stays functional but with increased stress on those points, so you'd want to repair it soon.",
        model: "chatgpt-4o-latest",
      },
    ],
    analysis: `**Overall Assessment**

This conversation balances technical accuracy with accessibility. Uses analogies while maintaining specific technical details.

**Strengths:**
- Perfect blend of analogy and technical detail
- Accessible yet precise
- Progressive complexity that builds understanding
- Addresses practical implications (repair needs)
- Works for both technical and general audiences

**Areas for Improvement:**
- Minor - could provide even more quantitative detail for experts

**Score: 91/100** - Excellent balance of clarity and precision`,
  },
];

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

export default function PathComparisonTest() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const { resolvedTheme } = useTheme();

  const sortedPaths = [...samplePaths].sort((a, b) => b.score - a.score);
  const selectedData = selectedPath
    ? samplePaths.find((p) => p.id === selectedPath)
    : null;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Path Comparison View</h1>
          <p className="text-muted-foreground">
            Compare complete conversation paths to find the best overall approach
          </p>
        </div>
        <Link href="/test">
          <Button variant="outline">← Back to Tests</Button>
        </Link>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant={showAnalysis ? "default" : "outline"}
          onClick={() => setShowAnalysis(!showAnalysis)}
        >
          {showAnalysis ? "Hide Analysis" : "Show Analysis"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Comparing {samplePaths.length} conversation paths
        </span>
      </div>

      {/* Path Selection */}
      <div className="grid grid-cols-3 gap-4">
        {sortedPaths.map((path) => {
          const isSelected = selectedPath === path.id;
          const color = calculateColor(path.score);
          return (
            <button
              key={path.id}
              onClick={() =>
                setSelectedPath(isSelected ? null : path.id)
              }
              className={`border rounded-lg p-4 text-left transition ${
                isSelected
                  ? "border-primary ring-2 ring-primary"
                  : "border-input hover:border-primary/60"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{path.name}</h3>
                <div
                  className="w-10 h-10 border-[2px] flex justify-center items-center rounded-full bg-card font-bold text-sm shrink-0 ml-2"
                  style={{ color, borderColor: color }}
                >
                  {path.score}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {path.turns.length} turns • Click to view details
              </p>
            </button>
          );
        })}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-3 gap-4">
        {sortedPaths.map((path) => {
          const color = calculateColor(path.score);
          return (
            <div key={path.id} className="border border-input rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-muted px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{path.name}</div>
                  <div
                    className="w-8 h-8 border-[2px] flex justify-center items-center rounded-full bg-card font-bold text-xs"
                    style={{ color, borderColor: color }}
                  >
                    {path.score}
                  </div>
                </div>
              </div>

              {/* Conversation */}
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-3">
                  {path.turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`text-sm ${
                        turn.role === "user"
                          ? "bg-muted/50 p-3 rounded-lg"
                          : "p-3"
                      }`}
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        {turn.role}
                        {turn.model && ` • ${turn.model}`}
                      </div>
                      <p className="text-sm leading-relaxed">{turn.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Analysis Panel */}
      {showAnalysis && selectedData && (
        <div className="border border-primary rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">
            Detailed Analysis: {selectedData.name}
          </h3>
          <div
            className={`prose ${
              resolvedTheme === "light" ? "prose" : "prose-invert"
            } max-w-none`}
          >
            <ReactMarkdown>{selectedData.analysis}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline">Select Best Path</Button>
        <Button variant="outline">Re-evaluate All Paths</Button>
        <Button variant="outline">Export Comparison</Button>
      </div>
    </div>
  );
}
