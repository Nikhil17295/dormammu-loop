import { describe, expect, it } from 'vitest';
import {
  Graph,
  GraphEdge,
  GraphNode,
  NodeStatus,
  childrenOf,
  descendantsOf,
  findCycle,
  parentsOf,
  readyNodes,
  roots,
  topologicalSort,
  validateGraph,
} from '../src/engine';

describe('Phase 2: Pure DAG Logic & Algorithms', () => {
  // Helper to quickly build nodes with valid default configurations
  function makeNode(id: string, type: GraphNode['type'] = 'transform', config: Record<string, any> = {}): GraphNode {
    const defaultConfig: Record<string, any> = {
      trigger: {},
      transform: { template: '{{ input.data }}' },
      http: { url: 'https://api.example.com/webhook' },
      delay: { seconds: 5 },
      output: { key: 'result' },
    };
    return {
      id,
      type,
      config: { ...defaultConfig[type], ...config },
    };
  }

  function makeEdge(source: string, target: string, id?: string): GraphEdge {
    return {
      id: id || `e-${source}-${target}`,
      source,
      target,
    };
  }

  describe('1. Topological Sort (Kahn\'s Algorithm)', () => {
    it('sorts a linear chain graph A -> B -> C', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger'), makeNode('B', 'transform'), makeNode('C', 'output')],
        edges: [makeEdge('A', 'B'), makeEdge('B', 'C')],
      };

      const result = topologicalSort(graph);
      expect(result.hasCycle).toBe(false);
      expect(result.order).toEqual(['A', 'B', 'C']);
    });

    it('sorts a diamond graph (fan-out and fan-in): A -> B, A -> C, B -> D, C -> D', () => {
      const graph: Graph = {
        nodes: [
          makeNode('A', 'trigger'),
          makeNode('B', 'http'),
          makeNode('C', 'transform'),
          makeNode('D', 'output'),
        ],
        edges: [
          makeEdge('A', 'B'),
          makeEdge('A', 'C'),
          makeEdge('B', 'D'),
          makeEdge('C', 'D'),
        ],
      };

      const result = topologicalSort(graph);
      expect(result.hasCycle).toBe(false);
      // B and C are tie-broken alphabetically
      expect(result.order).toEqual(['A', 'B', 'C', 'D']);
    });

    it('sorts disconnected graph components deterministically', () => {
      const graph: Graph = {
        nodes: [
          makeNode('A', 'trigger'),
          makeNode('B', 'output'),
          makeNode('C', 'trigger'),
          makeNode('D', 'output'),
        ],
        edges: [makeEdge('A', 'B'), makeEdge('C', 'D')],
      };

      const result = topologicalSort(graph);
      expect(result.hasCycle).toBe(false);
      // In-degree 0 nodes: A, C. A is dequeued first, enabling B.
      // Next ready nodes: B, C. Alphabetical tie-breaking chooses B, then C, then D.
      expect(result.order).toEqual(['A', 'B', 'C', 'D']);
    });

    it('detects a self-loop cycle A -> A', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger')],
        edges: [makeEdge('A', 'A')],
      };

      const result = topologicalSort(graph);
      expect(result.hasCycle).toBe(true);
      expect(result.order).toEqual([]);
    });

    it('detects a 2-node cycle: A -> B -> A', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger'), makeNode('B', 'transform')],
        edges: [makeEdge('A', 'B'), makeEdge('B', 'A')],
      };

      const result = topologicalSort(graph);
      expect(result.hasCycle).toBe(true);
      expect(result.order).toEqual([]);
    });

    it('detects a complex multi-node cycle: A -> B -> C -> D -> B', () => {
      const graph: Graph = {
        nodes: [
          makeNode('A', 'trigger'),
          makeNode('B', 'transform'),
          makeNode('C', 'http'),
          makeNode('D', 'output'),
        ],
        edges: [
          makeEdge('A', 'B'),
          makeEdge('B', 'C'),
          makeEdge('C', 'D'),
          makeEdge('D', 'B'),
        ],
      };

      const result = topologicalSort(graph);
      expect(result.hasCycle).toBe(true);
      // Node A is processed (in-degree 0), but B, C, D are stuck in cycle
      expect(result.order).toEqual(['A']);
    });

    it('produces identical deterministic ordering regardless of node input order', () => {
      const nodes = [
        makeNode('D', 'output'),
        makeNode('B', 'http'),
        makeNode('A', 'trigger'),
        makeNode('C', 'transform'),
      ];
      const edges = [
        makeEdge('A', 'C'),
        makeEdge('B', 'D'),
        makeEdge('C', 'D'),
        makeEdge('A', 'B'),
      ];

      const graph1: Graph = { nodes, edges };
      const graph2: Graph = {
        nodes: [...nodes].reverse(),
        edges: [...edges].reverse(),
      };

      const result1 = topologicalSort(graph1);
      const result2 = topologicalSort(graph2);

      expect(result1.order).toEqual(result2.order);
      expect(result1.order).toEqual(['A', 'B', 'C', 'D']);
    });

    it('handles an empty graph gracefully', () => {
      const result = topologicalSort({ nodes: [], edges: [] });
      expect(result.hasCycle).toBe(false);
      expect(result.order).toEqual([]);
    });
  });

  describe('2. Cycle Isolation (findCycle)', () => {
    it('returns null for an acyclic linear chain', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger'), makeNode('B', 'output')],
        edges: [makeEdge('A', 'B')],
      };
      expect(findCycle(graph)).toBeNull();
    });

    it('returns null for an acyclic diamond graph', () => {
      const graph: Graph = {
        nodes: [
          makeNode('A', 'trigger'),
          makeNode('B', 'transform'),
          makeNode('C', 'http'),
          makeNode('D', 'output'),
        ],
        edges: [
          makeEdge('A', 'B'),
          makeEdge('A', 'C'),
          makeEdge('B', 'D'),
          makeEdge('C', 'D'),
        ],
      };
      expect(findCycle(graph)).toBeNull();
    });

    it('isolates a self-loop: A -> A', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger')],
        edges: [makeEdge('A', 'A')],
      };
      const cycle = findCycle(graph);
      expect(cycle).toEqual(['A']);
    });

    it('isolates a 2-node cycle: A -> B -> A', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger'), makeNode('B', 'transform')],
        edges: [makeEdge('A', 'B'), makeEdge('B', 'A')],
      };
      const cycle = findCycle(graph);
      expect(cycle).toEqual(['A', 'B']);
    });

    it('isolates a complex multi-node cycle: A -> B -> C -> D -> B', () => {
      const graph: Graph = {
        nodes: [
          makeNode('A', 'trigger'),
          makeNode('B', 'transform'),
          makeNode('C', 'http'),
          makeNode('D', 'output'),
        ],
        edges: [
          makeEdge('A', 'B'),
          makeEdge('B', 'C'),
          makeEdge('C', 'D'),
          makeEdge('D', 'B'),
        ],
      };
      const cycle = findCycle(graph);
      // Offending cycle nodes should only be B, C, D (not A!)
      expect(cycle).toEqual(['B', 'C', 'D']);
    });
  });

  describe('3. Graph Validation (validateGraph)', () => {
    it('accepts a valid linear workflow', () => {
      const graph: Graph = {
        nodes: [
          makeNode('n1', 'trigger'),
          makeNode('n2', 'http', { url: 'https://api.github.com/users' }),
          makeNode('n3', 'transform', { template: 'Hello {{ n2.name }}' }),
          makeNode('n4', 'delay', { seconds: 10 }),
          makeNode('n5', 'output', { key: 'finalResult' }),
        ],
        edges: [
          makeEdge('n1', 'n2'),
          makeEdge('n2', 'n3'),
          makeEdge('n3', 'n4'),
          makeEdge('n4', 'n5'),
        ],
      };

      const errors = validateGraph(graph);
      expect(errors).toEqual([]);
    });

    it('flags empty graph error', () => {
      const errors = validateGraph({ nodes: [], edges: [] });
      expect(errors.some((e) => e.code === 'EMPTY_GRAPH')).toBe(true);
    });

    it('flags duplicate node IDs', () => {
      const graph: Graph = {
        nodes: [
          makeNode('dup', 'trigger'),
          makeNode('dup', 'output', { key: 'out' }),
        ],
        edges: [],
      };

      const errors = validateGraph(graph);
      const dupError = errors.find((e) => e.code === 'DUPLICATE_NODE_IDS');
      expect(dupError).toBeDefined();
      expect(dupError?.nodeIds).toContain('dup');
    });

    it('flags dangling edges referencing non-existent nodes', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger'), makeNode('B', 'output')],
        edges: [
          makeEdge('A', 'ghost-target', 'edge-1'),
          makeEdge('ghost-source', 'B', 'edge-2'),
        ],
      };

      const errors = validateGraph(graph);
      const dangling = errors.filter((e) => e.code === 'DANGLING_EDGE');
      expect(dangling.length).toBe(2);
      expect(dangling[0].nodeIds).toContain('ghost-target');
      expect(dangling[1].nodeIds).toContain('ghost-source');
    });

    it('flags self-loops with SELF_LOOP and CYCLE_DETECTED', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger')],
        edges: [makeEdge('A', 'A', 'edge-loop')],
      };

      const errors = validateGraph(graph);
      expect(errors.some((e) => e.code === 'SELF_LOOP')).toBe(true);
      expect(errors.some((e) => e.code === 'CYCLE_DETECTED')).toBe(true);
    });

    it('flags cycles with CYCLE_DETECTED and provides offending node IDs', () => {
      const graph: Graph = {
        nodes: [
          makeNode('T', 'trigger'),
          makeNode('A', 'transform'),
          makeNode('B', 'transform'),
        ],
        edges: [makeEdge('T', 'A'), makeEdge('A', 'B'), makeEdge('B', 'A')],
      };

      const errors = validateGraph(graph);
      const cycleError = errors.find((e) => e.code === 'CYCLE_DETECTED');
      expect(cycleError).toBeDefined();
      expect(cycleError?.nodeIds).toEqual(['A', 'B']);
    });

    it('flags missing trigger node', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'transform'), makeNode('B', 'output')],
        edges: [makeEdge('A', 'B')],
      };

      const errors = validateGraph(graph);
      expect(errors.some((e) => e.code === 'NO_TRIGGER')).toBe(true);
    });

    it('flags trigger node that has incoming edges', () => {
      const graph: Graph = {
        nodes: [makeNode('A', 'trigger'), makeNode('B', 'transform')],
        edges: [makeEdge('B', 'A')],
      };

      const errors = validateGraph(graph);
      const triggerError = errors.find((e) => e.code === 'TRIGGER_HAS_INCOMING_EDGES');
      expect(triggerError).toBeDefined();
      expect(triggerError?.nodeIds).toContain('A');
    });

    describe('Node Config Validation Rules', () => {
      it('validates HTTP node URL configuration', () => {
        // Missing URL
        const graph1: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('h', 'http', { url: '' })],
          edges: [makeEdge('t', 'h')],
        };
        expect(validateGraph(graph1).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);

        // Invalid protocol
        const graph2: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('h', 'http', { url: 'ftp://files.example.com' })],
          edges: [makeEdge('t', 'h')],
        };
        expect(validateGraph(graph2).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);

        // Malformed URL
        const graph3: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('h', 'http', { url: 'http://' })],
          edges: [makeEdge('t', 'h')],
        };
        expect(validateGraph(graph3).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);

        // Valid URLs
        const validHttp: Graph = {
          nodes: [
            makeNode('t', 'trigger'),
            makeNode('h1', 'http', { url: 'http://localhost:3000/api' }),
            makeNode('h2', 'http', { url: 'https://webhook.site/test' }),
          ],
          edges: [makeEdge('t', 'h1'), makeEdge('t', 'h2')],
        };
        expect(validateGraph(validHttp)).toEqual([]);
      });

      it('validates Delay node seconds configuration (integer between 1 and 60)', () => {
        const testDelay = (seconds: any) =>
          validateGraph({
            nodes: [makeNode('t', 'trigger'), makeNode('d', 'delay', { seconds })],
            edges: [makeEdge('t', 'd')],
          });

        expect(testDelay(undefined).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);
        expect(testDelay(0).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);
        expect(testDelay(-5).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);
        expect(testDelay(61).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);
        expect(testDelay(2.5).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);
        expect(testDelay('10').some((e) => e.code === 'INVALID_CONFIG')).toBe(true);

        // Valid delay bounds
        expect(testDelay(1)).toEqual([]);
        expect(testDelay(30)).toEqual([]);
        expect(testDelay(60)).toEqual([]);
      });

      it('validates Transform node template or mapping configuration', () => {
        // Missing template and mapping
        const invalidGraph: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('tr', 'transform', { template: '' })],
          edges: [makeEdge('t', 'tr')],
        };
        expect(validateGraph(invalidGraph).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);

        // Valid template
        const validTemplate: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('tr', 'transform', { template: 'User: {{ user.id }}' })],
          edges: [makeEdge('t', 'tr')],
        };
        expect(validateGraph(validTemplate)).toEqual([]);

        // Valid mapping
        const validMapping: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('tr', 'transform', { mapping: { userId: 'input.id' } })],
          edges: [makeEdge('t', 'tr')],
        };
        expect(validateGraph(validMapping)).toEqual([]);
      });

      it('validates Output node name or key configuration', () => {
        const invalidGraph: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('out', 'output', { key: '', name: '' })],
          edges: [makeEdge('t', 'out')],
        };
        expect(validateGraph(invalidGraph).some((e) => e.code === 'INVALID_CONFIG')).toBe(true);

        const validGraphKey: Graph = {
          nodes: [makeNode('t', 'trigger'), makeNode('out', 'output', { key: 'outputData' })],
          edges: [makeEdge('t', 'out')],
        };
        expect(validateGraph(validGraphKey)).toEqual([]);

        const validGraphName: Graph = {
          nodes: [makeNode('t', 'trigger'), { ...makeNode('out', 'output', {}), name: 'My Output' }],
          edges: [makeEdge('t', 'out')],
        };
        expect(validateGraph(validGraphName)).toEqual([]);
      });
    });
  });

  describe('4. Traversal Helpers (parentsOf, childrenOf, descendantsOf, roots)', () => {
    const diamond: Graph = {
      nodes: [
        makeNode('A', 'trigger'),
        makeNode('B', 'transform'),
        makeNode('C', 'http'),
        makeNode('D', 'transform'),
        makeNode('E', 'output'),
      ],
      edges: [
        makeEdge('A', 'B'),
        makeEdge('A', 'C'),
        makeEdge('B', 'D'),
        makeEdge('C', 'D'),
        makeEdge('D', 'E'),
      ],
    };

    it('parentsOf returns immediate predecessors', () => {
      expect(parentsOf(diamond, 'A')).toEqual([]);
      expect(parentsOf(diamond, 'B')).toEqual(['A']);
      expect(parentsOf(diamond, 'D')).toEqual(['B', 'C']);
      expect(parentsOf(diamond, 'E')).toEqual(['D']);
      expect(parentsOf(diamond, 'unknown')).toEqual([]);
    });

    it('childrenOf returns immediate successors', () => {
      expect(childrenOf(diamond, 'A')).toEqual(['B', 'C']);
      expect(childrenOf(diamond, 'B')).toEqual(['D']);
      expect(childrenOf(diamond, 'D')).toEqual(['E']);
      expect(childrenOf(diamond, 'E')).toEqual([]);
      expect(childrenOf(diamond, 'unknown')).toEqual([]);
    });

    it('descendantsOf returns all transitive downstream nodes', () => {
      expect(descendantsOf(diamond, 'A')).toEqual(['B', 'C', 'D', 'E']);
      expect(descendantsOf(diamond, 'B')).toEqual(['D', 'E']);
      expect(descendantsOf(diamond, 'C')).toEqual(['D', 'E']);
      expect(descendantsOf(diamond, 'D')).toEqual(['E']);
      expect(descendantsOf(diamond, 'E')).toEqual([]);
    });

    it('roots returns nodes with in-degree 0', () => {
      expect(roots(diamond)).toEqual(['A']);

      const multiRoots: Graph = {
        nodes: [makeNode('Z', 'trigger'), makeNode('A', 'trigger'), makeNode('B', 'output')],
        edges: [makeEdge('A', 'B'), makeEdge('Z', 'B')],
      };
      expect(roots(multiRoots)).toEqual(['A', 'Z']);
    });
  });

  describe('5. Node Readiness Calculator (readyNodes)', () => {
    const diamond: Graph = {
      nodes: [
        makeNode('A', 'trigger'),
        makeNode('B', 'transform'),
        makeNode('C', 'http'),
        makeNode('D', 'output'),
      ],
      edges: [
        makeEdge('A', 'B'),
        makeEdge('A', 'C'),
        makeEdge('B', 'D'),
        makeEdge('C', 'D'),
      ],
    };

    it('initial state: only root/trigger nodes are ready', () => {
      const statuses: Record<string, NodeStatus> = {
        A: 'pending',
        B: 'pending',
        C: 'pending',
        D: 'pending',
      };

      expect(readyNodes(diamond, statuses)).toEqual(['A']);
    });

    it('mid-execution: node waits until both parents in a diamond succeed', () => {
      // Step 1: A is running -> nothing ready
      expect(
        readyNodes(diamond, {
          A: 'running',
          B: 'pending',
          C: 'pending',
          D: 'pending',
        })
      ).toEqual([]);

      // Step 2: A succeeded -> B and C become ready simultaneously (alphabetical order)
      expect(
        readyNodes(diamond, {
          A: 'success',
          B: 'pending',
          C: 'pending',
          D: 'pending',
        })
      ).toEqual(['B', 'C']);

      // Step 3: B succeeded, but C is still running -> D is NOT ready yet
      expect(
        readyNodes(diamond, {
          A: 'success',
          B: 'success',
          C: 'running',
          D: 'pending',
        })
      ).toEqual([]);

      // Step 4: Both B and C succeeded -> D is now ready
      expect(
        readyNodes(diamond, {
          A: 'success',
          B: 'success',
          C: 'success',
          D: 'pending',
        })
      ).toEqual(['D']);
    });

    it('failed parent: downstream node is never marked ready', () => {
      // B fails, C succeeds -> D parent condition is violated
      expect(
        readyNodes(diamond, {
          A: 'success',
          B: 'failed',
          C: 'success',
          D: 'pending',
        })
      ).toEqual([]);
    });

    it('ignores nodes that are not in pending status', () => {
      expect(
        readyNodes(diamond, {
          A: 'success',
          B: 'success',
          C: 'success',
          D: 'running',
        })
      ).toEqual([]);

      expect(
        readyNodes(diamond, {
          A: 'success',
          B: 'success',
          C: 'success',
          D: 'success',
        })
      ).toEqual([]);
    });
  });
});
