"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";

interface Option {
  id: string;
  content: string;
  model: string;
  score?: number;
  quickReason?: string;
  evaluating?: boolean;
}

const sampleOptions: Option[] = [
  {
    id: "opt1",
    content:
      "It succeeds because the latch transfers the load into the frame, which distributes stress evenly.",
    model: "chatgpt-4o-latest",
    score: 85,
    quickReason: "Clear mechanism explanation with good technical terminology",
  },
  {
    id: "opt2",
    content:
      "The mechanism relies on counterbalancing forces; once they align, the motion feels effortless.",
    model: "gpt-4o-mini",
    score: 72,
    quickReason: "Vague explanation, doesn't directly address frame distribution",
  },
  {
    id: "opt3",
    content:
      "It functions because the latch seats flush against the base, creating a compression seal that resists slipping.",
    model: "gpt-4o-mini",
    score: 78,
    quickReason: "Good detail but focuses on different aspect than asked",
  },
  {
    id: "opt4",
    content:
      "The load distribution works through a triangulated support system where each connection point shares approximately 33% of the total force.",
    model: "gpt-5-chat-latest",
    score: 92,
    quickReason: "Excellent technical precision with quantitative details",
  },
  {
    id: "opt5",
    content: "It just works because it's designed that way.",
    model: "gpt-3.5-turbo",
    // No score yet - will show "Score" button
  },
  {
    id: "opt6",
    content:
      "The frame acts as a distributed load bearer, similar to how a bridge's cables share weight across multiple anchor points.",
    model: "claude-3.5-sonnet",
    evaluating: true, // Simulating in-progress evaluation
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

function ScoreBadge({ score }: { score: number }) {
  const color = calculateColor(score);
  return (
    <div
      className="w-10 h-10 border-[2px] flex justify-center items-center rounded-full bg-card font-bold text-sm"
      style={{ color, borderColor: color }}
    >
      {score}
    </div>
  );
}

export default function QuickScoreTest() {
  const [selectedOption, setSelectedOption] = useState(sampleOptions[0].id);

  const selectedIndex = sampleOptions.findIndex((opt) => opt.id === selectedOption);
  const selectedData = sampleOptions[selectedIndex];

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelectedOption(sampleOptions[selectedIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (selectedIndex < sampleOptions.length - 1) {
      setSelectedOption(sampleOptions[selectedIndex + 1].id);
    }
  };

  const handleScore = (optionId: string) => {
    console.log("Score option:", optionId);
    // In real implementation, this would trigger scoring
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Quick Score Cards</h1>
          <p className="text-muted-foreground">
            Lightweight evaluation with minimal UI - score on demand
          </p>
        </div>
        <Link href="/test">
          <Button variant="outline">← Back to Tests</Button>
        </Link>
      </div>

      {/* Context */}
      <div className="border border-input rounded-lg p-4 bg-muted/30">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Current question (User)
        </div>
        <p className="text-sm">Can you explain that frame distribution more plainly?</p>
      </div>

      {/* Option Selector Carousel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Response Options
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIndex === 0}
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground">
              {selectedIndex + 1} / {sampleOptions.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIndex === sampleOptions.length - 1}
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-4">
            {sampleOptions.map((option) => {
              const isActive = option.id === selectedOption;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={cn(
                    "relative w-64 min-h-[120px] rounded-lg border px-4 py-3 text-left transition flex flex-col gap-2",
                    "bg-muted",
                    isActive
                      ? "border-primary ring-2 ring-primary"
                      : "border-input hover:border-primary/60"
                  )}
                >
                  {/* Score Badge or Score Button */}
                  <div className="absolute top-2 right-2">
                    {option.evaluating ? (
                      <div className="w-10 h-10 border-2 border-muted-foreground/30 flex justify-center items-center rounded-full bg-card">
                        <Sparkles className="h-4 w-4 animate-pulse text-muted-foreground" />
                      </div>
                    ) : option.score !== undefined ? (
                      <ScoreBadge score={option.score} />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 w-10 p-0 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScore(option.id);
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Content Preview */}
                  <span
                    className="overflow-hidden text-left text-sm leading-snug flex-1 pr-14"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      whiteSpace: "normal",
                    }}
                  >
                    {option.content}
                  </span>

                  {/* Model */}
                  <span className="text-xs text-muted-foreground">
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
        <div className="border border-input rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-muted px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Selected Response</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedData.model}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedData.evaluating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Evaluating...
                </div>
              ) : selectedData.score !== undefined ? (
                <>
                  <ScoreBadge score={selectedData.score} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleScore(selectedData.id)}
                  >
                    Re-score
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleScore(selectedData.id)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Score This
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm leading-relaxed mb-6 whitespace-pre-wrap">
              {selectedData.content}
            </p>

            {/* Quick Score Summary */}
            {selectedData.score !== undefined && selectedData.quickReason && (
              <div className="border-t border-border pt-6">
                <div className="flex items-start gap-3">
                  {selectedData.score >= 80 ? (
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                      <ThumbsDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm mb-1">Quick Assessment</div>
                    <p className="text-sm text-muted-foreground">
                      {selectedData.quickReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Select This
          </Button>
          <Button variant="outline" size="sm">
            Add New Option
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Score All Unscored
          </Button>
          <Button variant="outline" size="sm">
            View Full Analysis
          </Button>
        </div>
      </div>

      {/* Info Panel */}
      <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm">
            <p className="font-medium mb-1">On-Demand Scoring</p>
            <p className="text-muted-foreground">
              Click the <Sparkles className="h-3 w-3 inline" /> icon on any option to
              generate a quick score. Scores are cached and persist across sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
