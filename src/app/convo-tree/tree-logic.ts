import type {
  ConversationTree,
  ConversationNode,
  ConversationRun,
  PathStep,
  RunTurn,
} from "./definitions";
import { ROOT_KEY } from "./definitions";
import { getNodeKey } from "./utils";

export function buildConversationTree(
  runs: ConversationRun[],
  rootKey: string
): ConversationTree {
  const nodesById: Record<string, ConversationNode> = {};
  const layers: ConversationNode[][] = [];
  const seen = new Map<string, ConversationNode>();

  const rootNode: ConversationNode = {
    id: getNodeKey(0, rootKey),
    depth: 0,
    role: "user",
    prefixKey: rootKey,
    options: [],
  };
  nodesById[rootNode.id] = rootNode;
  layers[0] = [rootNode];
  seen.set(rootNode.id, rootNode);

  let maxDepth = 1;

  runs.forEach((run) => {
    let prefix: string = rootKey;
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

  return { nodesById, layers, rootKey, maxDepth };
}

export function computeFollowUpDepth(
  nextPrefix: string,
  tree: ConversationTree,
  cache: Map<string, number> = new Map()
): number {
  if (cache.has(nextPrefix)) {
    return cache.get(nextPrefix)!;
  }

  // Find node with matching prefixKey
  const node = Object.values(tree.nodesById).find(
    (n) => n.prefixKey === nextPrefix
  );

  if (!node || node.options.length === 0) {
    cache.set(nextPrefix, 0);
    return 0;
  }

  const maxChildDepth = Math.max(
    ...node.options.map((opt) =>
      computeFollowUpDepth(opt.nextPrefix, tree, cache)
    )
  );

  const depth = 1 + maxChildDepth;
  cache.set(nextPrefix, depth);
  return depth;
}

export function buildPath(
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

export function collectTurnsUpToDepth(
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
