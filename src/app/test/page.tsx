"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TestHubPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Evaluation UX Prototypes</h1>
        <p className="text-muted-foreground">
          Testing different approaches for evaluating conversation tree responses
        </p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <Link href="/test/inline-evaluator">
          <div className="border border-input rounded-lg p-6 hover:border-primary transition-colors cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">Inline Option Evaluator</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Evaluate multiple response options side-by-side with rubric-based scoring.
              Shows scores as badges on option cards.
            </p>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                Recommended
              </span>
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                Best for: Single node evaluation
              </span>
            </div>
          </div>
        </Link>

        <Link href="/test/path-comparison">
          <div className="border border-input rounded-lg p-6 hover:border-primary transition-colors cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">Path Comparison View</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Compare 2-5 complete conversation paths side-by-side to see which
              approach leads to the best overall outcome.
            </p>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                Best for: Full conversation evaluation
              </span>
            </div>
          </div>
        </Link>

        <Link href="/test/quick-score">
          <div className="border border-input rounded-lg p-6 hover:border-primary transition-colors cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">Quick Score Cards</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Lightweight evaluation showing scores and brief reasoning without
              full rubric UI. Minimal context switching.
            </p>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                Best for: Fast iteration
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="pt-4">
        <Link href="/convo-tree/inline">
          <Button variant="outline">← Back to Convo Tree</Button>
        </Link>
      </div>
    </div>
  );
}
