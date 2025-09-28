"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { generateChatCompletion, type ChatMessage } from "@/app/_ai/nlp";

type Role = "user" | "assistant";

interface RunTurn {
  role: Role;
  content: string;
  model?: string;
}

interface ConversationRun {
  id: string;
  turns: RunTurn[];
}

interface ConversationOption {
  id: string;
  content: string;
  runIds: string[];
  models: string[];
  nextPrefix: string;
}

interface ConversationNode {
  id: string;
  depth: number;
  role: Role;
  prefixKey: string;
  options: ConversationOption[];
}

interface ConversationTree {
  nodesById: Record<string, ConversationNode>;
  layers: ConversationNode[][];
  rootKey: string;
  maxDepth: number;
}

interface PathStep {
  node: ConversationNode;
  selectedOption: ConversationOption | null;
}

const sampleRuns: ConversationRun[] = [
  {
    id: "reason_variant_a",
    turns: [
      { role: "user", content: "What is the reason this works?" },
      {
        role: "assistant",
        content:
          "It succeeds because the latch transfers the load into the frame, which distributes stress evenly.",
        model: "gpt-4o",
      },
      {
        role: "user",
        content: "Can you explain that frame distribution more plainly?",
      },
      {
        role: "assistant",
        content:
          "Imagine the frame as a loop of helpers—each helper takes a small portion of the weight so no one breaks a sweat.",
        model: "gpt-4o",
      },
    ],
  },
  {
    id: "reason_variant_b",
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
    ],
  },
  {
    id: "reason_variant_c",
    turns: [
      { role: "user", content: "What is the reason this works?" },
      {
        role: "assistant",
        content:
          "It functions because the latch seats flush against the base, creating a compression seal that resists slipping.",
        model: "gpt-4o-mini",
      },
      {
        role: "user",
        content: "Can you explain that frame distribution more plainly?",
      },
      {
        role: "assistant",
        content:
          "Picture a mason stacking bricks—the mortar spreads the pressure so the wall doesn’t crumble under load.",
        model: "gpt-4o-mini",
      },
    ],
  },
  {
    id: "why_variant_a",
    turns: [
      { role: "user", content: "Why does this work?" },
      {
        role: "assistant",
        content:
          "Because we constrain the motion at three points, the system stabilizes and resists wobble.",
        model: "gpt-3.5-turbo",
      },
      {
        role: "user",
        content: "What if one of those points loosens over time?",
      },
      {
        role: "assistant",
        content:
          "Then you would notice a slight sway; tightening the joint reintroduces that third constraint and steadies the rig.",
        model: "gpt-3.5-turbo",
      },
    ],
  },
  {
    id: "why_variant_b",
    turns: [
      { role: "user", content: "Why does this work?" },
      {
        role: "assistant",
        content:
          "The design channels energy along the stiffest members, so flex never gathers in one brittle spot.",
        model: "gpt-3.5-turbo",
      },
      {
        role: "user",
        content: "What if one of those points loosens over time?",
      },
      {
        role: "assistant",
        content:
          "We’d shim the connection or replace the fastener—anything that restores the original energy path.",
        model: "gpt-3.5-turbo",
      },
    ],
  },
  {
    id: "how_variant_a",
    turns: [
      { role: "user", content: "How does it work?" },
      {
        role: "assistant",
        content:
          "First, a sensor samples the input. A small controller compares it to the reference and instructs the actuator to adjust.",
        model: "gpt-4o",
      },
      {
        role: "user",
        content: "Can it adapt to sudden spikes?",
      },
      {
        role: "assistant",
        content:
          "Yes. The controller keeps a buffer of recent readings, so when it spots a spike it nudges the actuator in smaller, faster bursts.",
        model: "gpt-4o",
      },
    ],
  },
  {
    id: "how_variant_b",
    turns: [
      { role: "user", content: "How does it work?" },
      {
        role: "assistant",
        content:
          "A lightweight agent relays your request to a graph of tools. The graph resolves which tool is capable and orchestrates the call.",
        model: "gpt-4o",
      },
      {
        role: "user",
        content: "Can it adapt to sudden spikes?",
      },
      {
        role: "assistant",
        content:
          "If the incoming volume jumps, the orchestrator spins up parallel tool calls and merges their results before replying.",
        model: "gpt-4o",
      },
    ],
  },
];

const ROOT_KEY = "root";
const DEFAULT_GENERATE_MODEL = "chatgpt-4o-latest";
const DEFAULT_GENERATE_TEMPERATURE = 1;
const DEFAULT_SYSTEM_PROMPT = "";
const MODELS = [
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
];

const getNodeKey = (depth: number, prefix: string) => `${depth}-${prefix}`;

const normalizedTemperatureForModel = (model: string, temperature: number) =>
  model.startsWith("gpt-5") ? 1 : temperature;

const isValidChatMessage = (
  message: ChatMessage | undefined | null
): message is ChatMessage =>
  Boolean(message && message.role && typeof message.content === "string");

function buildConversationMessages(turns: RunTurn[]): ChatMessage[] {
  return turns
    .filter((turn): turn is RunTurn =>
      Boolean(turn && turn.role && turn.content)
    )
    .map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
}

function buildCompletionMessages(
  conversation: ChatMessage[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT
): ChatMessage[] {
  const trimmedPrompt = systemPrompt.trim();
  const systemMessages = trimmedPrompt
    ? ([
        {
          role: "system" as const,
          content: trimmedPrompt,
        },
      ] satisfies ChatMessage[])
    : [];
  return [...systemMessages, ...conversation].filter(isValidChatMessage);
}

function sanitizeRuns(runs: ConversationRun[] | undefined): ConversationRun[] {
  if (!Array.isArray(runs)) {
    return [];
  }

  return runs
    .map((run) => {
      if (!run || !Array.isArray(run.turns)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Skipping malformed run", run);
        }
        return null;
      }

      const turns: RunTurn[] = [];
      for (let index = 0; index < run.turns.length; index++) {
        const turn = run.turns[index];
        if (!turn) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Skipping run with missing turn", { run, index });
          }
          return null;
        }

        if (turn.role !== "user" && turn.role !== "assistant") {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Skipping run with invalid role", { run, index });
          }
          return null;
        }

        const rawContent = typeof turn.content === "string" ? turn.content : "";
        const trimmed = rawContent.trim();
        if (trimmed.length === 0) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Skipping run with empty content", { run, index });
          }
          return null;
        }

        turns.push({ role: turn.role, content: trimmed, model: turn.model });
      }

      if (turns.length === 0) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Skipping empty run", run);
        }
        return null;
      }

      return { ...run, turns };
    })
    .filter((run): run is ConversationRun => Boolean(run));
}

function buildConversationTree(runs: ConversationRun[]): ConversationTree {
  const nodesById: Record<string, ConversationNode> = {};
  const layers: ConversationNode[][] = [];
  const seen = new Map<string, ConversationNode>();

  const rootNode: ConversationNode = {
    id: getNodeKey(0, ROOT_KEY),
    depth: 0,
    role: "user",
    prefixKey: ROOT_KEY,
    options: [],
  };
  nodesById[rootNode.id] = rootNode;
  layers[0] = [rootNode];
  seen.set(rootNode.id, rootNode);

  let maxDepth = 1;

  runs.forEach((run) => {
    let prefix = ROOT_KEY;
    run.turns.forEach((turn, index) => {
      const nodeKey = getNodeKey(index, prefix);
      let node = seen.get(nodeKey);
      if (!node) {
        node = {
          id: nodeKey,
          depth: index,
          role: turn.role,
          prefixKey: prefix,
          options: [],
        };
        seen.set(nodeKey, node);
        nodesById[node.id] = node;
        if (!layers[index]) {
          layers[index] = [];
        }
        layers[index].push(node);
      }

      let option = node.options.find((opt) => opt.content === turn.content);
      if (!option) {
        option = {
          id: `${node.id}-opt-${node.options.length}`,
          content: turn.content,
          runIds: [],
          models: [],
          nextPrefix: `${nodeKey}|${turn.role}:${turn.content}`,
        };
        node.options.push(option);
      }

      if (!option.runIds.includes(run.id)) {
        option.runIds.push(run.id);
      }
      if (turn.model && !option.models.includes(turn.model)) {
        option.models.push(turn.model);
      }

      prefix = option.nextPrefix;
      maxDepth = Math.max(maxDepth, index + 1);
    });
  });

  layers.forEach((layer) => {
    layer.sort((a, b) => a.prefixKey.localeCompare(b.prefixKey));
  });

  return { nodesById, layers, rootKey: ROOT_KEY, maxDepth };
}

function buildPath(
  tree: ConversationTree,
  selectedMap: Record<string, string>
): PathStep[] {
  const steps: PathStep[] = [];
  let prefix = tree.rootKey;

  for (let depth = 0; depth < tree.maxDepth; depth++) {
    const nodeKey = getNodeKey(depth, prefix);
    const node = tree.nodesById[nodeKey];
    if (!node) {
      break;
    }

    if (node.options.length === 0) {
      steps.push({ node, selectedOption: null });
      break;
    }

    const selectedOptionId = selectedMap[node.id];
    const selectedOption =
      node.options.find((opt) => opt.id === selectedOptionId) ??
      node.options[0] ??
      null;

    steps.push({ node, selectedOption });

    if (!selectedOption) {
      break;
    }

    prefix = selectedOption.nextPrefix;
  }

  return steps;
}

function friendlyRoleLabel(role: Role) {
  return role === "user" ? "User" : "AI";
}

function nextRole(role: Role): Role {
  return role === "user" ? "assistant" : "user";
}

function collectTurnsUpToDepth(
  tree: ConversationTree,
  selectedMap: Record<string, string>,
  depth: number,
  runs: ConversationRun[]
): RunTurn[] | null {
  const turns: RunTurn[] = [];
  let prefix = tree.rootKey;
  let candidateRunIds: string[] | null = null;
  for (let d = 0; d < depth; d++) {
    const nodeKey = getNodeKey(d, prefix);
    const node = tree.nodesById[nodeKey];
    if (!node || node.options.length === 0) {
      return null;
    }
    const selectedOptionId = selectedMap[node.id];
    const option =
      node.options.find((opt) => opt.id === selectedOptionId) ??
      node.options[0];
    if (!option) {
      return null;
    }
    candidateRunIds = candidateRunIds
      ? option.runIds.filter((id) => candidateRunIds!.includes(id))
      : [...option.runIds];

    let resolvedTurn: RunTurn | null = null;
    if (candidateRunIds.length) {
      const baseRun = runs.find((run) => run.id === candidateRunIds![0]);
      if (baseRun && baseRun.turns[d]) {
        const turn = baseRun.turns[d];
        resolvedTurn = { ...turn };
      }
    }
    turns.push(
      resolvedTurn ?? {
        role: node.role,
        content: option.content,
        model: option.models[0],
      }
    );
    prefix = option.nextPrefix;
  }
  return turns;
}

function generateRunId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function turnsEqual(a: RunTurn[], b: RunTurn[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((turn, index) => {
    const other = b[index];
    return turn.role === other.role && turn.content === other.content;
  });
}

function runsEqual(a: ConversationRun[], b: ConversationRun[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((run, index) => {
    const other = b[index];
    if (!other || run.id !== other.id) {
      return false;
    }
    return turnsEqual(run.turns, other.turns);
  });
}

export default function ConvoTreePage() {
  const [runs, setRawRuns] = useState<ConversationRun[]>([]);
  const setRuns = useCallback((action: SetStateAction<ConversationRun[]>) => {
    setRawRuns((prev) => {
      const proposed =
        typeof action === "function"
          ? (action as (current: ConversationRun[]) => ConversationRun[])(prev)
          : action;
      const sanitized = sanitizeRuns(proposed);
      return runsEqual(prev, sanitized) ? prev : sanitized;
    });
  }, []);
  const [showMeta, setShowMeta] = useState(true);
  const [generatingMap, setGeneratingMap] = useState<Record<string, number>>(
    {}
  );
  const [generateModel, setGenerateModel] = useState<string>(
    DEFAULT_GENERATE_MODEL
  );
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [generateTemperature, setGenerateTemperature] = useState<number>(
    DEFAULT_GENERATE_TEMPERATURE
  );
  const isFixedTemperatureModel = generateModel.startsWith("gpt-5");

  useEffect(() => {
    if (isFixedTemperatureModel) {
      setGenerateTemperature(1);
    }
  }, [isFixedTemperatureModel]);

  const tree = useMemo(() => buildConversationTree(runs), [runs]);
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({});
  const pendingRunSelection = useRef<string | null>(null);

  useEffect(() => {
    setSelectedMap((prev) => {
      const next: Record<string, string> = {};
      tree.layers.forEach((layer) => {
        layer.forEach((node) => {
          const currentSelectionId = prev[node.id];
          let selectedOption =
            node.options.find((opt) => opt.id === currentSelectionId) ?? null;

          if (!selectedOption && pendingRunSelection.current) {
            selectedOption =
              node.options.find((opt) =>
                opt.runIds.includes(pendingRunSelection.current as string)
              ) ?? null;
          }

          if (!selectedOption && node.options[0]) {
            selectedOption = node.options[0];
          }

          if (selectedOption) {
            next[node.id] = selectedOption.id;
          }
        });
      });

      pendingRunSelection.current = null;
      return next;
    });
  }, [tree]);

  const path = useMemo(() => buildPath(tree, selectedMap), [tree, selectedMap]);

  const handleToggleMeta = () => setShowMeta((prev) => !prev);
  const handleReset = () => {
    pendingRunSelection.current = null;
    setRuns([]);
    setSelectedMap({});
  };
  const handleLoadExample = () => {
    pendingRunSelection.current = null;
    setRuns(sampleRuns);
  };

  const handleAddOption = (
    node: ConversationNode,
    content: string,
    options?: { model?: string }
  ) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }
    const baseTurns = collectTurnsUpToDepth(
      tree,
      selectedMap,
      node.depth,
      runs
    );
    if (!baseTurns) {
      return;
    }
    const newTurns: RunTurn[] = [
      ...baseTurns,
      {
        role: node.role,
        content: trimmed,
        model:
          options?.model ?? (node.role === "assistant" ? "manual" : undefined),
      },
    ];

    if (runs.some((run) => turnsEqual(run.turns, newTurns))) {
      return;
    }

    const newRunId = generateRunId();
    pendingRunSelection.current = newRunId;
    setRuns((prev) => [...prev, { id: newRunId, turns: newTurns }]);
    setSelectedMap((prev) => {
      const next = { ...prev };
      delete next[node.id];
      return next;
    });
  };

  const handleAddNextTurn = (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    content: string,
    options?: { model?: string }
  ) => {
    const trimmed = content.trim();
    if (!trimmed || !selectedOption) {
      return;
    }

    const baseRunId = selectedOption.runIds[0];
    let baseTurns: RunTurn[] | null = null;

    if (baseRunId) {
      const baseRun = runs.find((run) => run.id === baseRunId);
      if (baseRun) {
        baseTurns = baseRun.turns.slice(0, node.depth + 1);
      }
    }

    if (!baseTurns) {
      baseTurns = collectTurnsUpToDepth(
        tree,
        selectedMap,
        node.depth + 1,
        runs
      );
    }

    if (!baseTurns) {
      return;
    }

    const newTurns: RunTurn[] = [
      ...baseTurns,
      {
        role: nextRole(node.role),
        content: trimmed,
        model:
          options?.model ??
          (nextRole(node.role) === "assistant" ? "manual" : undefined),
      },
    ];

    if (runs.some((run) => turnsEqual(run.turns, newTurns))) {
      return;
    }

    const newRunId = generateRunId();
    pendingRunSelection.current = newRunId;
    setRuns((prev) => [...prev, { id: newRunId, turns: newTurns }]);
  };

  const handleEditNode = (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    runId: string,
    updatedContent: string
  ) => {
    if (!selectedOption) {
      return;
    }
    const targetIndex = node.depth;
    setRuns((prev) => {
      return prev.map((run) => {
        if (run.id !== runId) {
          return run;
        }
        const turns = run.turns.map((turn, index) => {
          if (index !== targetIndex) {
            return turn;
          }
          return {
            ...turn,
            content: updatedContent,
            model: turn.role === "assistant" ? "edited" : turn.model,
          };
        });
        return { ...run, turns };
      });
    });
    pendingRunSelection.current = runId;
    setSelectedMap((prev) => {
      const next = { ...prev };
      delete next[node.id];
      return next;
    });
  };

  const handlePruneNode = (runIds: string[]) => {
    if (!runIds.length) {
      return;
    }
    setRuns((prev) => prev.filter((run) => !runIds.includes(run.id)));
    pendingRunSelection.current = null;
    setSelectedMap({});
  };

  const handleGenerateNext = async (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    model?: string,
    count: number = 1,
    temperatureOverride?: number
  ) => {
    if (!selectedOption || nextRole(node.role) !== "assistant") {
      return;
    }

    const contextTurns = collectTurnsUpToDepth(
      tree,
      { ...selectedMap, [node.id]: selectedOption.id },
      node.depth + 1,
      runs
    );
    if (!contextTurns) {
      return;
    }

    const generateKey = `${node.id}:${selectedOption.id}`;

    const adjustGenerating = (delta: number) => {
      setGeneratingMap((prev) => {
        const next = { ...prev };
        const current = (next[generateKey] ?? 0) + delta;
        if (current <= 0) {
          delete next[generateKey];
        } else {
          next[generateKey] = current;
        }
        return next;
      });
    };

    try {
      const conversationMessages = buildConversationMessages(contextTurns);

      if (conversationMessages.length === 0) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Cannot generate without a user prompt", {
            contextTurns,
            node,
          });
        }
        return;
      }

      const lastConversationMessage =
        conversationMessages[conversationMessages.length - 1];
      if (lastConversationMessage.role !== "user") {
        if (process.env.NODE_ENV !== "production") {
          console.error("Last turn before generation must be a user message", {
            node,
            conversationMessages,
          });
        }
        return;
      }

      const messages = buildCompletionMessages(conversationMessages);

      const chosenModel = model ?? DEFAULT_GENERATE_MODEL;
      const requestedTemperature =
        typeof temperatureOverride === "number"
          ? temperatureOverride
          : DEFAULT_GENERATE_TEMPERATURE;
      const temperature = normalizedTemperatureForModel(
        chosenModel,
        requestedTemperature
      );

      if (process.env.NODE_ENV !== "production") {
        console.debug("Generating", {
          chosenModel,
          temperature,
          messages,
          conversationMessages,
          contextTurns,
        });
      }

      adjustGenerating(count);

      const tasks = Array.from({ length: count }, (_unused, index) =>
        (async () => {
          try {
            const generated = await generateChatCompletion({
              model: chosenModel,
              messages,
              temperature,
            });
            if (generated) {
              handleAddNextTurn(node, selectedOption, generated, {
                model: chosenModel,
              });
            }
          } catch (error) {
            console.error("Failed to generate response", { error, index });
          } finally {
            adjustGenerating(-1);
          }
        })()
      );

      await Promise.allSettled(tasks);
    } catch (error) {
      console.error("Failed to generate response", error);
    }
  };

  const handleSelectOption = (
    node: ConversationNode,
    option: ConversationOption
  ) => {
    setSelectedMap((prev) => {
      const next: Record<string, string> = { ...prev, [node.id]: option.id };
      tree.layers.forEach((layer) => {
        layer.forEach((layerNode) => {
          if (layerNode.depth > node.depth) {
            delete next[layerNode.id];
          }
        });
      });
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Conversation Tree</h1>
        <p className="text-muted-foreground max-w-3xl">
          Explore layered conversations by stitching multiple runs into a single
          vertical story. Swap between alternate responses at any turn to see
          how different branches unfold without losing your place.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={handleReset}>
          Reset convo
        </Button>
        <Button size="sm" onClick={handleLoadExample}>
          Load example convo
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Model</span>
          <Select value={generateModel} onValueChange={setGenerateModel}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Count</span>
          <Input
            type="number"
            min={1}
            max={10}
            value={generateCount}
            onChange={(event) =>
              setGenerateCount(() => {
                const value = Number(event.target.value);
                if (Number.isNaN(value)) return 1;
                return Math.min(Math.max(value, 1), 10);
              })
            }
            className="h-9 w-16"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Temp</span>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={isFixedTemperatureModel ? 1 : generateTemperature}
            disabled={isFixedTemperatureModel}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isNaN(value)) {
                setGenerateTemperature(DEFAULT_GENERATE_TEMPERATURE);
                return;
              }
              setGenerateTemperature(() => Math.min(Math.max(value, 0), 2));
            }}
            className="h-9 w-20"
          />
          {isFixedTemperatureModel && (
            <span className="text-xs text-muted-foreground">
              Fixed at 1 for {generateModel}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={showMeta ? "default" : "outline"}
          onClick={handleToggleMeta}
        >
          {showMeta ? "Hide meta" : "Show meta"}
        </Button>
      </div>
      <div className="space-y-6">
        {(() => {
          let previousCandidates: string[] | null = null;
          return path.map((step, index) => {
            let runCandidates: string[] = [];
            if (step.selectedOption) {
              const optionRuns = step.selectedOption.runIds;
              runCandidates = previousCandidates
                ? optionRuns.filter((id) => previousCandidates!.includes(id))
                : [...optionRuns];
            } else if (previousCandidates) {
              runCandidates = [...previousCandidates];
            }
            previousCandidates = runCandidates;

            return (
              <ConversationNodeCard
                key={step.node.id}
                node={step.node}
                selectedOption={step.selectedOption}
                index={index}
                total={path.length}
                showMeta={showMeta}
                onSelectOption={handleSelectOption}
                onAddOption={handleAddOption}
                onAddNextTurn={handleAddNextTurn}
                onGenerateNext={(node, option) =>
                  handleGenerateNext(
                    node,
                    option,
                    generateModel,
                    generateCount,
                    generateTemperature
                  )
                }
                onEditNode={handleEditNode}
                onPruneNode={handlePruneNode}
                isGenerating={
                  !!(
                    step.selectedOption &&
                    generatingMap[`${step.node.id}:${step.selectedOption.id}`]
                  )
                }
                runCandidates={runCandidates}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}

interface ConversationNodeCardProps {
  node: ConversationNode;
  selectedOption: ConversationOption | null;
  index: number;
  total: number;
  showMeta: boolean;
  onSelectOption: (node: ConversationNode, option: ConversationOption) => void;
  onAddOption: (
    node: ConversationNode,
    content: string,
    options?: { model?: string }
  ) => void;
  onAddNextTurn: (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    content: string,
    options?: { model?: string }
  ) => void;
  onGenerateNext: (
    node: ConversationNode,
    selectedOption: ConversationOption | null
  ) => void;
  onEditNode: (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    runId: string,
    updatedContent: string
  ) => void;
  onPruneNode: (runIds: string[]) => void;
  isGenerating: boolean;
  runCandidates: string[];
}

function ConversationNodeCard({
  node,
  selectedOption,
  index,
  total,
  showMeta,
  onSelectOption,
  onAddOption,
  onAddNextTurn,
  onGenerateNext,
  onEditNode,
  onPruneNode,
  isGenerating,
  runCandidates,
}: ConversationNodeCardProps) {
  const selectedIndex = selectedOption
    ? node.options.findIndex((opt) => opt.id === selectedOption.id)
    : -1;
  const hasOptions = node.options.length > 0;
  const activeRunId = runCandidates[0];

  return (
    <div className="relative rounded-xl border border-border/70 bg-muted p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Turn {index + 1} of {total} · {friendlyRoleLabel(node.role)}
          </h2>
          {showMeta && (
            <p className="text-xs text-muted-foreground mt-1">
              {node.options.length} option
              {node.options.length === 1 ? "" : "s"} over {uniqueRunCount(node)}{" "}
              conversation run
              {uniqueRunCount(node) === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <OptionControls
            node={node}
            selectedIndex={selectedIndex}
            onSelectOption={(option) => onSelectOption(node, option)}
          />
          <AddMessageButton
            label="Add option"
            title={`Add ${friendlyRoleLabel(node.role)} option`}
            description={`Create another ${friendlyRoleLabel(
              node.role
            )} message for this turn.`}
            onSubmit={(value) => onAddOption(node, value)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <OptionSelector
          node={node}
          selectedOptionId={selectedOption?.id ?? null}
          onSelectOption={(option) => onSelectOption(node, option)}
        />
        <div className="rounded-lg border border-border/60 bg-card p-4 text-sm leading-relaxed shadow-inner">
          {hasOptions && selectedOption ? (
            <div className="space-y-3">
              <p className="whitespace-pre-wrap">{selectedOption.content}</p>
              {selectedOption.models?.length ? (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  <span className="font-medium uppercase tracking-wide">
                    Models
                  </span>
                  <span>{selectedOption.models.join(", ")}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No options yet. Add one to start branching this turn.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {nextRole(node.role) === "assistant" && selectedOption && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onGenerateNext(node, selectedOption)}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating…" : "Generate response"}
            </Button>
          )}
          <AddMessageButton
            label={`Add next ${friendlyRoleLabel(nextRole(node.role))}`}
            title={`Add ${friendlyRoleLabel(nextRole(node.role))} turn`}
            description={`Extend the conversation after this ${friendlyRoleLabel(
              node.role
            )} message.`}
            onSubmit={(value) => onAddNextTurn(node, selectedOption, value)}
            disabled={!hasOptions || !selectedOption || isGenerating}
          />
          {selectedOption && activeRunId && (
            <AddMessageButton
              label="Edit message"
              title={`Edit ${friendlyRoleLabel(node.role)} message`}
              description="Update the content for this branch without creating a new option."
              defaultValue={selectedOption.content}
              submitLabel="Update"
              onSubmit={(value) =>
                onEditNode(node, selectedOption, activeRunId, value)
              }
              disabled={isGenerating}
            />
          )}
          {runCandidates.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onPruneNode(runCandidates)}
              disabled={isGenerating}
            >
              Prune branch
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function uniqueRunCount(node: ConversationNode) {
  const runIds = new Set<string>();
  node.options.forEach((option) => {
    option.runIds.forEach((id) => runIds.add(id));
  });
  return runIds.size;
}

interface OptionControlsProps {
  node: ConversationNode;
  selectedIndex: number;
  onSelectOption: (option: ConversationOption) => void;
}

function OptionControls({
  node,
  selectedIndex,
  onSelectOption,
}: OptionControlsProps) {
  if (node.options.length === 0) {
    return (
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        No options yet
      </span>
    );
  }

  const hasMultiple = node.options.length > 1;
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const prevOption =
    hasMultiple && safeIndex > 0 ? node.options[safeIndex - 1] : undefined;
  const nextOption =
    hasMultiple && safeIndex < node.options.length - 1
      ? node.options[safeIndex + 1]
      : undefined;

  if (!hasMultiple) {
    return (
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Single path
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={!prevOption}
        onClick={() => prevOption && onSelectOption(prevOption)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Option {safeIndex + 1} / {node.options.length}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={!nextOption}
        onClick={() => nextOption && onSelectOption(nextOption)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface OptionSelectorProps {
  node: ConversationNode;
  selectedOptionId: string | null;
  onSelectOption: (option: ConversationOption) => void;
}

function OptionSelector({
  node,
  selectedOptionId,
  onSelectOption,
}: OptionSelectorProps) {
  if (node.options.length <= 1) {
    return null;
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-3 pr-4">
        {node.options.map((option) => {
          const isActive = selectedOptionId
            ? option.id === selectedOptionId
            : false;
          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option)}
              className={cn(
                "w-56 min-h-[112px] rounded-lg border px-4 py-3 text-left transition flex flex-col gap-2",
                "bg-muted",
                isActive
                  ? "border-primary text-primary"
                  : "border-input text-foreground hover:border-primary/60"
              )}
            >
              <span
                className="overflow-hidden text-left text-sm leading-snug flex-1"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  whiteSpace: "normal",
                }}
              >
                {option.content}
              </span>
              {option.models.length ? (
                <span className="text-xs text-muted-foreground whitespace-normal break-words">
                  {option.models.join(", ")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface AddMessageButtonProps {
  label: string;
  title: string;
  description?: string;
  onSubmit: (content: string) => void;
  disabled?: boolean;
  defaultValue?: string;
  submitLabel?: string;
}

function AddMessageButton({
  label,
  title,
  description,
  onSubmit,
  disabled,
  defaultValue,
  submitLabel,
}: AddMessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? "");
    }
  }, [open, defaultValue]);

  const closeDialog = () => {
    setOpen(false);
    setValue(defaultValue ?? "");
  };

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    closeDialog();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={6}
          placeholder="Type the message content..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!value.trim()}>
            {submitLabel ?? "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
