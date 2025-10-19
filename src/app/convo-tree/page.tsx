"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  generateChatCompletion,
  createRubric,
  promptSystemAnalysis,
  messageScore,
  validateAndConvert,
  type ChatMessage,
} from "@/app/_ai/nlp";
import {
  RESPONSE_MODEL_OPTIONS,
  ANALYSIS_MODEL_OPTIONS,
  type ResponseModelValue,
  type AnalysisModelValue,
} from "@/lib/model-options";
import { PRESETS } from "@/lib/presets";

// Shared types and logic
import type {
  Role,
  RunTurn,
  ConversationRun,
  ConversationOption,
  ConversationNode,
  ConversationTree,
  PathStep,
} from "./definitions";
import { ROOT_KEY } from "./definitions";
import {
  buildConversationTree,
  computeFollowUpDepth,
  buildPath,
  collectTurnsUpToDepth,
} from "./tree-logic";
import {
  getNodeKey,
  friendlyRoleLabel,
  nextRole,
  generateRunId,
  turnsEqual,
  hashContent,
} from "./utils";
import { EvaluationDialog } from "./components/EvaluationDialog";

const sampleRuns: ConversationRun[] = [
  {
    id: "reason_variant_a",
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
          "Imagine the frame as a loop of helpers—each helper takes a small portion of the weight so no one breaks a sweat.",
        model: "chatgpt-4o-latest",
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
        model: "chatgpt-4o-latest",
      },
      {
        role: "user",
        content: "Can it adapt to sudden spikes?",
      },
      {
        role: "assistant",
        content:
          "Yes. The controller keeps a buffer of recent readings, so when it spots a spike it nudges the actuator in smaller, faster bursts.",
        model: "chatgpt-4o-latest",
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

const DEFAULT_SYSTEM_PROMPT = "";
const DEFAULT_GENERATE_MODEL: ResponseModelValue = "gpt-5-chat-latest";
const ADDITIONAL_GENERATE_MODEL: ResponseModelValue = "chatgpt-4o-latest";
const DEFAULT_GENERATE_COUNT = 5;
const DEFAULT_GENERATE_TEMPERATURE = 1.2;
const NO_PRESET_VALUE = "__none";

const normalizedTemperatureForModel = (
  model: ResponseModelValue,
  temperature: number
) =>
  model.startsWith("gpt-5") ? 1 : temperature;

const normalizedTemperatureForAnalysis = (
  model: string,
  temperature: number
) =>
  model.startsWith("gpt-5") ? 1 : temperature;

interface GenerateConfig {
  id: string;
  model: ResponseModelValue;
  count: number;
}

type GenerateRequest = Pick<GenerateConfig, "model" | "count">;

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
  const [generatingMap, setGeneratingMap] = useState<Record<string, number>>({});
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    undefined
  );

  // Evaluation state
  interface NodeEvaluation {
    rubric: string | null;
    isGeneratingRubric: boolean;
    evaluations: Map<
      string,
      { optionId: string; score: number | null; analysis: string; isGenerating: boolean }
    >;
  }
  const [nodeEvaluations, setNodeEvaluations] = useState<Map<string, NodeEvaluation>>(
    new Map()
  );
  const [evaluatingNodeId, setEvaluatingNodeId] = useState<string | null>(null);
  const [generateConfigs, setGenerateConfigs] = useState<GenerateConfig[]>([
    {
      id: "config_0",
      model: DEFAULT_GENERATE_MODEL,
      count: DEFAULT_GENERATE_COUNT,
    },
  ]);
  const generateConfigIdRef = useRef(1);
  const [generateTemperature, setGenerateTemperature] = useState<number>(
    DEFAULT_GENERATE_TEMPERATURE
  );
  const [evaluationModel, setEvaluationModel] = useState<AnalysisModelValue>("gpt-5-mini");
  const isFixedTemperatureModel = useMemo(
    () => generateConfigs.some((config) => config.model.startsWith("gpt-5")),
    [generateConfigs]
  );

  useEffect(() => {
    if (isFixedTemperatureModel) {
      setGenerateTemperature(1);
    }
  }, [isFixedTemperatureModel]);

  const clearPresetSelection = useCallback(() => {
    setSelectedPreset(undefined);
  }, [setSelectedPreset]);

  const handlePresetChange = useCallback(
    (presetId: string | undefined) => {
      setSelectedPreset(presetId);
      if (!presetId) {
        return;
      }

      const preset = PRESETS.find((candidate) => candidate.id === presetId);
      if (!preset) {
        return;
      }

      setGenerateConfigs(
        preset.models.map((modelConfig, index) => ({
          id: `preset_${preset.id}_${index}`,
          model: modelConfig.response_model,
          count: modelConfig.num_responses,
        }))
      );
      generateConfigIdRef.current = preset.models.length;

      if (preset.defaultResponseTemperature !== undefined) {
        const nextTemperature = Math.min(
          Math.max(preset.defaultResponseTemperature, 0),
          2
        );
        setGenerateTemperature(nextTemperature);
      }
    },
    [setGenerateConfigs, setGenerateTemperature, setSelectedPreset]
  );

  const handleAddGenerateConfig = useCallback(() => {
    clearPresetSelection();
    setGenerateConfigs((prev) => [
      ...prev,
      {
        id: `config_${generateConfigIdRef.current++}`,
        model: ADDITIONAL_GENERATE_MODEL,
        count: DEFAULT_GENERATE_COUNT,
      },
    ]);
  }, [clearPresetSelection]);

  const handleUpdateGenerateConfig = useCallback(
    (id: string, updates: Partial<Omit<GenerateConfig, "id">>) => {
      clearPresetSelection();
      setGenerateConfigs((prev) =>
        prev.map((config) =>
          config.id === id ? { ...config, ...updates } : config
        )
      );
    },
    [clearPresetSelection]
  );

  const handleRemoveGenerateConfig = useCallback((id: string) => {
    clearPresetSelection();
    setGenerateConfigs((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((config) => config.id !== id);
    });
  }, [clearPresetSelection]);

  const tree = useMemo(() => buildConversationTree(runs, ROOT_KEY), [runs]);

  const followUpDepthMap = useMemo(() => {
    const map = new Map<string, number>();
    const cache = new Map<string, number>();

    // Compute depth for all option nextPrefixes
    Object.values(tree.nodesById).forEach((node) => {
      node.options.forEach((option) => {
        map.set(option.nextPrefix, computeFollowUpDepth(option.nextPrefix, tree, cache));
      });
    });

    return map;
  }, [tree]);

  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedMap((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      // Validation-only: fill missing selections, keep existing valid ones
      tree.layers.forEach((layer) => {
        layer.forEach((node) => {
          const currentSelectionId = prev[node.id];
          const isValidSelection = node.options.some(
            (opt) => opt.id === currentSelectionId
          );

          // Only set selection if missing or invalid
          if (!isValidSelection && node.options[0]) {
            next[node.id] = node.options[0].id;
            hasChanges = true;
          }
        });
      });

      // Only return new object if something actually changed
      return hasChanges ? next : prev;
    });
  }, [tree]);

  const path = useMemo(() => buildPath(tree, selectedMap), [tree, selectedMap]);

  const handleReset = () => {
    setRuns([]);
    setSelectedMap({});
    clearPresetSelection();
  };
  const handleLoadExample = () => {
    setRuns(sampleRuns);
    clearPresetSelection();
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
    setRuns((prev) => [...prev, { id: newRunId, turns: newTurns }]);

    // Directly set selection to new option (content-based ID)
    const contentHash = hashContent(trimmed);
    const newOptionId = `${node.id}-opt-${contentHash}`;
    setSelectedMap((prev) => ({
      ...prev,
      [node.id]: newOptionId,
    }));
  };

  const handleAddNextTurn = (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    content: string,
    options?: { model?: string; role?: Role }
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

    const turnRole = options?.role ?? nextRole(node.role);
    const newTurns: RunTurn[] = [
      ...baseTurns,
      {
        role: turnRole,
        content: trimmed,
        model:
          options?.model ??
          (turnRole === "assistant" ? "manual" : undefined),
      },
    ];

    if (runs.some((run) => turnsEqual(run.turns, newTurns))) {
      return;
    }

    const newRunId = generateRunId();
    setRuns((prev) => [...prev, { id: newRunId, turns: newTurns }]);

    // Directly set selection for the new child node (content-based ID)
    const childNodeId = getNodeKey(node.depth + 1, selectedOption.nextPrefix);
    const contentHash = hashContent(trimmed);
    const newOptionId = `${childNodeId}-opt-${contentHash}`;
    setSelectedMap((prev) => ({
      ...prev,
      [childNodeId]: newOptionId,
    }));
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

    // Update selection to new content-based ID after edit
    const contentHash = hashContent(updatedContent);
    const newOptionId = `${node.id}-opt-${contentHash}`;
    setSelectedMap((prev) => ({
      ...prev,
      [node.id]: newOptionId,
    }));
  };

  const handlePruneNode = (runIds: string[]) => {
    if (!runIds.length) {
      return;
    }
    setRuns((prev) => prev.filter((run) => !runIds.includes(run.id)));
    setSelectedMap({});
  };

  const handleGenerateNext = async (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    requests: GenerateRequest[],
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

    const safeRequests = (requests ?? []).filter(
      (request) => request && Number.isFinite(request.count) && request.count > 0
    );
    if (safeRequests.length === 0) {
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

      const requestedTemperature =
        typeof temperatureOverride === "number"
          ? temperatureOverride
          : DEFAULT_GENERATE_TEMPERATURE;
      if (messages.some((msg) => !msg.role || msg.content == null)) {
        console.error("Invalid flat messages", messages);
        throw new Error("Invalid message in generation");
      }

      await Promise.all(
        safeRequests.map(async (request) => {
          const chosenModel = request.model || DEFAULT_GENERATE_MODEL;
          const count = Math.max(1, Math.round(request.count));
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
              count,
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
        })
      );
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

  // Helper: Generate rubric for evaluation
  const generateRubric = async (contextTurns: RunTurn[], nodeRole: Role) => {
    const conversationContext = contextTurns
      .map((turn) => `${turn.role}: ${turn.content}`)
      .join("\n\n");
    const evaluationPrompt = `Given this conversation context:\n\n${conversationContext}\n\nEvaluate the following ${nodeRole} responses.`;

    return await createRubric(
      evaluationPrompt,
      evaluationModel,
      normalizedTemperatureForAnalysis(evaluationModel, 0.0)
    );
  };

  // Helper: Evaluate a single option and return score + analysis
  const evaluateSingleOption = async (
    rubric: string,
    optionContent: string
  ): Promise<{ score: number; analysis: string }> => {
    const analysisMessages: ChatMessage[] = [
      { role: "system", content: promptSystemAnalysis(rubric) },
      { role: "user", content: optionContent },
    ];

    const analysis = await generateChatCompletion({
      model: evaluationModel,
      messages: analysisMessages,
      temperature: normalizedTemperatureForAnalysis(evaluationModel, 0.0),
    });

    const scoreMessages: ChatMessage[] = [
      ...analysisMessages,
      { role: "assistant", content: analysis },
      {
        role: "user",
        content: `Based on your analysis, provide a score from 0-100. Return ONLY a JSON object with format: {"score": <number>}`,
      },
    ];

    const scoreResponse = await generateChatCompletion({
      model: evaluationModel,
      messages: scoreMessages,
      temperature: normalizedTemperatureForAnalysis(evaluationModel, 0.0),
    });

    let score = 0;
    try {
      const parsed = JSON.parse(scoreResponse);
      score = validateAndConvert(parsed.score);
    } catch (parseError) {
      console.error("Failed to parse score", { scoreResponse, parseError });
      const match = scoreResponse.match(/\d+/);
      score = match ? validateAndConvert(match[0]) : 0;
    }

    return { score, analysis };
  };

  // Helper: Update evaluation state
  const updateNodeEvaluation = (
    nodeId: string,
    updates: Partial<NodeEvaluation> | ((prev: NodeEvaluation) => NodeEvaluation)
  ) => {
    setNodeEvaluations((prev) => {
      const next = new Map(prev);
      const current = next.get(nodeId) || {
        rubric: null,
        isGeneratingRubric: false,
        evaluations: new Map(),
      };
      const updated = typeof updates === "function" ? updates(current) : { ...current, ...updates };
      next.set(nodeId, updated);
      return next;
    });
  };

  // Main handler: Orchestrates evaluation
  const handleEvaluateOptions = async (node: ConversationNode) => {
    if (node.options.length === 0) return;

    const contextTurns = collectTurnsUpToDepth(tree, selectedMap, node.depth, runs);
    if (!contextTurns) return;

    // Initialize/reset state
    updateNodeEvaluation(node.id, { isGeneratingRubric: true });

    try {
      // Step 1: Generate rubric
      const rubric = await generateRubric(contextTurns, node.role);
      updateNodeEvaluation(node.id, { rubric, isGeneratingRubric: false });

      // Step 2: Evaluate each option
      for (const option of node.options) {
        updateNodeEvaluation(node.id, (prev) => {
          const evals = new Map(prev.evaluations);
          evals.set(option.id, {
            optionId: option.id,
            score: null,
            analysis: "",
            isGenerating: true,
          });
          return { ...prev, evaluations: evals };
        });

        try {
          const { score, analysis } = await evaluateSingleOption(rubric, option.content);

          updateNodeEvaluation(node.id, (prev) => {
            const evals = new Map(prev.evaluations);
            evals.set(option.id, {
              optionId: option.id,
              score,
              analysis,
              isGenerating: false,
            });
            return { ...prev, evaluations: evals };
          });
        } catch (error) {
          console.error("Failed to evaluate option", { option, error });
          updateNodeEvaluation(node.id, (prev) => {
            const evals = new Map(prev.evaluations);
            evals.set(option.id, {
              optionId: option.id,
              score: 0,
              analysis: "Failed to generate analysis",
              isGenerating: false,
            });
            return { ...prev, evaluations: evals };
          });
        }
      }
    } catch (error) {
      console.error("Failed to generate rubric", error);
      updateNodeEvaluation(node.id, { isGeneratingRubric: false });
    }
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
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex-1">
              <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Model Presets (Optional)
              </div>
              <Select
                value={selectedPreset}
                onValueChange={(value) =>
                  handlePresetChange(
                    value === NO_PRESET_VALUE ? undefined : value
                  )
                }
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Select a preset to auto-fill models" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NO_PRESET_VALUE}>
                    None (Manual selection)
                  </SelectItem>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {preset.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Response Models
          </div>
          <div className="border border-input rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_150px_80px] items-center bg-muted px-4 py-2 text-sm font-medium uppercase tracking-wide">
              <span>Model</span>
              <span className="text-right"># Responses</span>
              <span className="text-center">Actions</span>
            </div>
            {generateConfigs.map((config) => (
              <div
                key={config.id}
                className="grid grid-cols-[1fr_150px_80px] items-center gap-2 border-t border-input px-4 py-3"
              >
                <Select
                  value={config.model}
                  onValueChange={(value) =>
                    handleUpdateGenerateConfig(config.id, {
                      model: value as ResponseModelValue,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {RESPONSE_MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={config.count}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    handleUpdateGenerateConfig(config.id, {
                      count: Number.isNaN(value)
                        ? DEFAULT_GENERATE_COUNT
                        : Math.max(Math.round(value), 1),
                    });
                  }}
                  className="h-9"
                />
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGenerateConfig(config.id)}
                    disabled={generateConfigs.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddGenerateConfig}
            >
              Add model
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
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
                setGenerateTemperature(() =>
                  Math.min(Math.max(value, 0), 2)
                );
              }}
              className="h-9 w-20"
            />
          </div>
          {isFixedTemperatureModel && (
            <span className="text-xs text-muted-foreground">
              Temperature fixed at 1 when GPT-5 models are selected.
            </span>
          )}
          <div className="flex items-center gap-2">
            <span>Evaluation Model</span>
            <Select
              value={evaluationModel}
              onValueChange={(value) => setEvaluationModel(value as AnalysisModelValue)}
            >
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="space-y-6 pb-32">
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
                followUpDepthMap={followUpDepthMap}
                onSelectOption={handleSelectOption}
                onAddOption={handleAddOption}
                onAddNextTurn={handleAddNextTurn}
                onGenerateNext={(node, option) =>
                  handleGenerateNext(
                    node,
                    option,
                    generateConfigs.map(({ model, count }) => ({
                      model,
                      count,
                    })),
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
                onEvaluateOptions={handleEvaluateOptions}
                nodeEvaluation={nodeEvaluations.get(step.node.id)}
                evaluatingNodeId={evaluatingNodeId}
                setEvaluatingNodeId={setEvaluatingNodeId}
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
  followUpDepthMap: Map<string, number>;
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
  onEvaluateOptions: (node: ConversationNode) => Promise<void>;
  nodeEvaluation?: {
    rubric: string | null;
    isGeneratingRubric: boolean;
    evaluations: Map<
      string,
      { optionId: string; score: number | null; analysis: string; isGenerating: boolean }
    >;
  };
  evaluatingNodeId: string | null;
  setEvaluatingNodeId: (id: string | null) => void;
}

function ConversationNodeCard({
  node,
  selectedOption,
  index,
  total,
  followUpDepthMap,
  onSelectOption,
  onAddOption,
  onAddNextTurn,
  onGenerateNext,
  onEditNode,
  onPruneNode,
  isGenerating,
  runCandidates,
  onEvaluateOptions,
  nodeEvaluation,
  evaluatingNodeId,
  setEvaluatingNodeId,
}: ConversationNodeCardProps) {
  const selectedIndex = selectedOption
    ? node.options.findIndex((opt) => opt.id === selectedOption.id)
    : -1;
  const hasOptions = node.options.length > 0;
  const activeRunId = runCandidates[0];

  return (
    <div className="relative border-b border-border py-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {nextRole(node.role) === "assistant" && selectedOption && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGenerateNext(node, selectedOption)}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating…" : "Generate"}
              </Button>
            )}
            <AddTurnDropdown
              node={node}
              selectedOption={selectedOption}
              onAddNextTurn={onAddNextTurn}
              disabled={!hasOptions || !selectedOption || isGenerating}
            />
            {selectedOption && activeRunId && (
              <AddMessageButton
                label="Edit"
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
                variant="outline"
                onClick={() => onPruneNode(runCandidates)}
                disabled={isGenerating}
                className="text-destructive hover:text-destructive"
              >
                Prune
              </Button>
            )}
            {node.options.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEvaluatingNodeId(node.id)}
                disabled={isGenerating}
              >
                Evaluate Options
              </Button>
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
      </div>

      <div className="mt-4 space-y-3">
        <OptionSelector
          node={node}
          selectedOptionId={selectedOption?.id ?? null}
          followUpDepthMap={followUpDepthMap}
          onSelectOption={(option) => onSelectOption(node, option)}
          nodeEvaluation={nodeEvaluation}
        />
        <div className="rounded-lg border border-border/60 bg-card p-4 text-sm leading-relaxed shadow-inner max-h-[min(800px,80vh)] overflow-auto">
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
      </div>

      <EvaluationDialog
        open={evaluatingNodeId === node.id}
        onOpenChange={(open) => {
          if (!open) setEvaluatingNodeId(null);
        }}
        options={node.options}
        evaluations={nodeEvaluation?.evaluations ?? new Map()}
        rubric={nodeEvaluation?.rubric ?? null}
        isGeneratingRubric={nodeEvaluation?.isGeneratingRubric ?? false}
        onEvaluate={() => onEvaluateOptions(node)}
        onSelectOption={(option) => {
          onSelectOption(node, option);
        }}
      />
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
  followUpDepthMap: Map<string, number>;
  onSelectOption: (option: ConversationOption) => void;
  nodeEvaluation?: {
    rubric: string | null;
    isGeneratingRubric: boolean;
    evaluations: Map<
      string,
      { optionId: string; score: number | null; analysis: string; isGenerating: boolean }
    >;
  };
}

function OptionSelector({
  node,
  selectedOptionId,
  followUpDepthMap,
  onSelectOption,
  nodeEvaluation,
}: OptionSelectorProps) {
  if (node.options.length === 0) {
    return null;
  }

  const calculateColor = (value: number) => {
    let r = (100 - value) * 2.0;
    let g = value * 2.0;
    let b = 0;

    r = Math.round(r);
    g = Math.round(g);

    let hexR = r.toString(16).padStart(2, "0");
    let hexG = g.toString(16).padStart(2, "0");
    let hexB = b.toString(16).padStart(2, "0");

    return `#${hexR}${hexG}${hexB}`;
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-3 pr-4">
        {node.options.map((option) => {
          const isActive = selectedOptionId
            ? option.id === selectedOptionId
            : false;
          const depth = followUpDepthMap.get(option.nextPrefix) ?? 0;
          const evaluation = nodeEvaluation?.evaluations.get(option.id);
          const score = evaluation?.score;
          const hasScore = score !== null && score !== undefined;

          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option)}
              className={cn(
                "relative w-56 min-h-[112px] rounded-lg border px-4 py-3 text-left transition flex flex-col gap-2",
                "bg-muted",
                isActive
                  ? "border-primary text-primary"
                  : "border-input text-foreground hover:border-primary/60"
              )}
            >
              {/* Score badge or depth badge */}
              {hasScore ? (
                <div
                  className="absolute top-2 right-2 w-8 h-8 border-[2px] flex justify-center items-center rounded-full bg-card font-bold text-xs"
                  style={{
                    color: calculateColor(score),
                    borderColor: calculateColor(score),
                  }}
                >
                  {score}
                </div>
              ) : depth > 0 ? (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {depth}
                </span>
              ) : null}
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

interface AddTurnDropdownProps {
  node: ConversationNode;
  selectedOption: ConversationOption | null;
  onAddNextTurn: (
    node: ConversationNode,
    selectedOption: ConversationOption | null,
    content: string,
    options?: { model?: string; role?: Role }
  ) => void;
  disabled?: boolean;
}

function AddTurnDropdown({
  node,
  selectedOption,
  onAddNextTurn,
  disabled,
}: AddTurnDropdownProps) {
  const [dialogRole, setDialogRole] = useState<Role | null>(null);
  const [value, setValue] = useState("");

  const closeDialog = () => {
    setDialogRole(null);
    setValue("");
  };

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed || !dialogRole) {
      return;
    }
    onAddNextTurn(node, selectedOption, trimmed, { role: dialogRole });
    closeDialog();
  };

  return (
    <>
      {/* Simple buttons instead of dropdown to avoid aria-hidden conflicts */}
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setDialogRole("user")}
      >
        Add User
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setDialogRole("assistant")}
      >
        Add Assistant
      </Button>

      <Dialog open={!!dialogRole} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {dialogRole === "user" ? "user" : "assistant"} turn
            </DialogTitle>
            <DialogDescription>
              Extend the conversation with a {dialogRole === "user" ? "user" : "assistant"} message.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={6}
            placeholder="Type the message content..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!value.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
