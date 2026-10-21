import {
  Graph,
  GraphNode,
  NodeStatus,
  TopologicalSortResult,
  ValidationError,
} from './types';

/**
 * Calculates a deterministic topological ordering using Kahn's algorithm.
 * Tie-breaking is performed by sorting ready nodes alphabetically by id.
 *
 * @param graph The workflow graph containing nodes and edges.
 * @returns Object with topological order array and hasCycle boolean flag.
 */
export function topologicalSort(graph: Graph): TopologicalSortResult {
  if (graph.nodes.length === 0) {
    return { order: [], hasCycle: false };
  }

  const nodeIds = graph.nodes.map((n) => n.id);
  const nodeSet = new Set(nodeIds);

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of graph.edges) {
    if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Find all nodes with zero in-degree
  const readyQueue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      readyQueue.push(id);
    }
  }

  // Deterministic tie-breaking: process ready nodes alphabetically by ID
  readyQueue.sort((a, b) => a.localeCompare(b));

  const order: string[] = [];

  while (readyQueue.length > 0) {
    const current = readyQueue.shift()!;
    order.push(current);

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        readyQueue.push(neighbor);
        readyQueue.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  const hasCycle = order.length < nodeSet.size;
  return { order, hasCycle };
}

/**
 * Isolates the subset of nodes participating in a cycle using DFS back-edge detection.
 * Nodes and edges are evaluated in deterministic order (alphabetical by ID).
 *
 * @param graph The workflow graph.
 * @returns Array of node IDs forming the cycle, or null if acyclic.
 */
export function findCycle(graph: Graph): string[] | null {
  const { hasCycle } = topologicalSort(graph);
  if (!hasCycle) {
    return null;
  }

  const nodeIds = graph.nodes.map((n) => n.id).sort((a, b) => a.localeCompare(b));
  const nodeSet = new Set(nodeIds);

  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }

  for (const edge of graph.edges) {
    if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  // Sort outgoing edges deterministically
  for (const neighbors of adj.values()) {
    neighbors.sort((a, b) => a.localeCompare(b));
  }

  // 0: unvisited, 1: visiting (in current recursion stack), 2: visited
  const visited = new Map<string, number>();
  for (const id of nodeIds) {
    visited.set(id, 0);
  }

  const currentPath: string[] = [];

  function dfs(u: string): string[] | null {
    visited.set(u, 1);
    currentPath.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (visited.get(v) === 1) {
        // Back-edge discovered! Extract the cyclic slice from v to u
        const cycleStartIndex = currentPath.indexOf(v);
        if (cycleStartIndex !== -1) {
          return currentPath.slice(cycleStartIndex);
        }
        return [v, u];
      }
      if (visited.get(v) === 0) {
        const cycle = dfs(v);
        if (cycle) return cycle;
      }
    }

    currentPath.pop();
    visited.set(u, 2);
    return null;
  }

  for (const id of nodeIds) {
    if (visited.get(id) === 0) {
      const cycle = dfs(id);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

/**
 * Returns immediate predecessor (parent) node IDs for a given node.
 */
export function parentsOf(graph: Graph, nodeId: string): string[] {
  const parents = new Set<string>();
  const nodeExists = graph.nodes.some((n) => n.id === nodeId);
  if (!nodeExists) return [];

  for (const edge of graph.edges) {
    if (edge.target === nodeId) {
      parents.add(edge.source);
    }
  }
  return Array.from(parents).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns immediate successor (child) node IDs for a given node.
 */
export function childrenOf(graph: Graph, nodeId: string): string[] {
  const children = new Set<string>();
  const nodeExists = graph.nodes.some((n) => n.id === nodeId);
  if (!nodeExists) return [];

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      children.add(edge.target);
    }
  }
  return Array.from(children).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns all transitive downstream node IDs reachable from a given node.
 * Used for cascading skips when an upstream node fails.
 */
export function descendantsOf(graph: Graph, nodeId: string): string[] {
  const nodeExists = graph.nodes.some((n) => n.id === nodeId);
  if (!nodeExists) return [];

  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  const descendants = new Set<string>();
  const queue = [...(adj.get(nodeId) || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!descendants.has(current)) {
      descendants.add(current);
      const nextChildren = adj.get(current) || [];
      for (const next of nextChildren) {
        if (!descendants.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  return Array.from(descendants).sort((a, b) => a.localeCompare(b));
}

/**
 * Returns all root node IDs (nodes with zero incoming edges).
 */
export function roots(graph: Graph): string[] {
  const targetNodes = new Set<string>();
  for (const edge of graph.edges) {
    targetNodes.add(edge.target);
  }

  const rootList = graph.nodes
    .filter((node) => !targetNodes.has(node.id))
    .map((node) => node.id);

  return Array.from(new Set(rootList)).sort((a, b) => a.localeCompare(b));
}

/**
 * Calculates which nodes are ready for execution based on current statuses.
 * A node is ready if:
 * 1. Its current status is 'pending'
 * 2. All of its parents have reached status 'success' (roots have zero parents, so always ready)
 *
 * @param graph The workflow graph.
 * @param statusByNodeId Map of current statuses per node ID.
 * @returns Sorted array of ready node IDs.
 */
export function readyNodes(
  graph: Graph,
  statusByNodeId: Record<string, NodeStatus>
): string[] {
  const ready: string[] = [];

  for (const node of graph.nodes) {
    if (statusByNodeId[node.id] !== 'pending') {
      continue;
    }

    const parents = parentsOf(graph, node.id);
    const allParentsSucceeded = parents.every(
      (parentId) => statusByNodeId[parentId] === 'success'
    );

    if (allParentsSucceeded) {
      ready.push(node.id);
    }
  }

  return ready.sort((a, b) => a.localeCompare(b));
}

/**
 * Validates a workflow graph for structural integrity, cycle freedom, and valid node configurations.
 *
 * @param graph The workflow graph.
 * @returns Array of ValidationError objects (empty if valid).
 */
export function validateGraph(graph: Graph): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Empty graph check
  if (!graph.nodes || graph.nodes.length === 0) {
    errors.push({
      code: 'EMPTY_GRAPH',
      message: 'Workflow graph must contain at least one node.',
    });
    return errors;
  }

  // 2. Duplicate node IDs check
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const node of graph.nodes) {
    if (seenIds.has(node.id)) {
      duplicateIds.add(node.id);
    } else {
      seenIds.add(node.id);
    }
  }
  if (duplicateIds.size > 0) {
    errors.push({
      code: 'DUPLICATE_NODE_IDS',
      message: `Duplicate node ID(s) detected: ${Array.from(duplicateIds).join(', ')}.`,
      nodeIds: Array.from(duplicateIds),
    });
  }

  const nodeIdSet = new Set(graph.nodes.map((n) => n.id));

  // 3. Dangling edges check
  const danglingEdges = (graph.edges || []).filter(
    (edge) => !nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)
  );
  if (danglingEdges.length > 0) {
    for (const edge of danglingEdges) {
      const missingIds = [edge.source, edge.target].filter((id) => !nodeIdSet.has(id));
      errors.push({
        code: 'DANGLING_EDGE',
        message: `Edge "${edge.id}" references non-existent node(s): ${missingIds.join(', ')}.`,
        nodeIds: missingIds,
      });
    }
  }

  // 4. Self-loops check
  for (const edge of graph.edges || []) {
    if (edge.source === edge.target) {
      errors.push({
        code: 'SELF_LOOP',
        message: `Self-loop detected: edge "${edge.id}" connects node "${edge.source}" directly to itself.`,
        nodeIds: [edge.source],
      });
    }
  }

  // 5. Trigger rules: at least one trigger, and triggers cannot have incoming edges
  const triggerNodes = graph.nodes.filter((n) => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push({
      code: 'NO_TRIGGER',
      message: 'Workflow graph must contain at least one trigger node.',
    });
  } else {
    for (const trigger of triggerNodes) {
      const incomingEdges = (graph.edges || []).filter((e) => e.target === trigger.id);
      if (incomingEdges.length > 0) {
        errors.push({
          code: 'TRIGGER_HAS_INCOMING_EDGES',
          message: `Trigger node "${trigger.id}" cannot have incoming edges.`,
          nodeIds: [trigger.id],
        });
      }
    }
  }

  // 6. Node configuration rules
  for (const node of graph.nodes) {
    validateNodeConfig(node, errors);
  }

  // 7. Cycle detection (only if no dangling edges and no duplicate IDs)
  if (danglingEdges.length === 0 && duplicateIds.size === 0) {
    const { hasCycle } = topologicalSort(graph);
    if (hasCycle) {
      const cycle = findCycle(graph);
      errors.push({
        code: 'CYCLE_DETECTED',
        message: cycle
          ? `Cycle detected involving nodes: ${cycle.join(' -> ')} -> ${cycle[0]}.`
          : 'Cycle detected in graph.',
        nodeIds: cycle ?? undefined,
      });
    }
  }

  return errors;
}

/**
 * Validates individual node config requirements.
 */
function validateNodeConfig(node: GraphNode, errors: ValidationError[]): void {
  const config = node.config || {};

  switch (node.type) {
    case 'http': {
      const url = config.url;
      if (typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        errors.push({
          code: 'INVALID_CONFIG',
          message: `HTTP node "${node.id}" must specify a valid URL starting with http:// or https://.`,
          nodeIds: [node.id],
        });
      } else {
        try {
          new URL(url);
        } catch {
          errors.push({
            code: 'INVALID_CONFIG',
            message: `HTTP node "${node.id}" contains a malformed URL: "${url}".`,
            nodeIds: [node.id],
          });
        }
      }
      break;
    }

    case 'delay': {
      const seconds = config.seconds;
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60) {
        errors.push({
          code: 'INVALID_CONFIG',
          message: `Delay node "${node.id}" must specify "seconds" as an integer between 1 and 60.`,
          nodeIds: [node.id],
        });
      }
      break;
    }

    case 'transform': {
      const hasTemplate =
        typeof config.template === 'string' && config.template.trim().length > 0;
      const hasMapping =
        config.mapping !== null &&
        typeof config.mapping === 'object' &&
        !Array.isArray(config.mapping) &&
        Object.keys(config.mapping).length > 0;

      if (!hasTemplate && !hasMapping) {
        errors.push({
          code: 'INVALID_CONFIG',
          message: `Transform node "${node.id}" must provide a non-empty "template" string or "mapping" object.`,
          nodeIds: [node.id],
        });
      }
      break;
    }

    case 'output': {
      const hasKey = typeof config.key === 'string' && config.key.trim().length > 0;
      const hasConfigName = typeof config.name === 'string' && config.name.trim().length > 0;
      const hasNodeName = typeof node.name === 'string' && node.name.trim().length > 0;

      if (!hasKey && !hasConfigName && !hasNodeName) {
        errors.push({
          code: 'INVALID_CONFIG',
          message: `Output node "${node.id}" must specify a non-empty "name" or "key".`,
          nodeIds: [node.id],
        });
      }
      break;
    }

    case 'trigger':
      // Trigger config is optional or flexible (e.g. event, cron schedule)
      break;
  }
}
