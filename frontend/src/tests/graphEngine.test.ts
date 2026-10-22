import { describe, it, expect } from 'vitest';
import {
  canConnectEdge,
  validateGraph,
} from '../engine/graph';
import { Graph, GraphNode, GraphEdge } from '../engine/types';

describe('Frontend Graph Engine & Edge Validation', () => {
  const sampleNodes: GraphNode[] = [
    {
      id: 'trigger_1',
      type: 'trigger',
      name: 'Start',
      config: { type: 'manual' },
    },
    {
      id: 'http_1',
      type: 'http',
      name: 'Fetch API',
      config: { method: 'GET', url: 'https://api.example.com/items' },
    },
    {
      id: 'transform_1',
      type: 'transform',
      name: 'Format Response',
      config: { template: 'Items: {{ http_1.data }}' },
    },
    {
      id: 'delay_1',
      type: 'delay',
      name: 'Wait 5s',
      config: { seconds: 5 },
    },
    {
      id: 'output_1',
      type: 'output',
      name: 'Result Sink',
      config: { key: 'finalResult' },
    },
  ];

  it('allows valid forward connections in a linear pipeline', () => {
    const edges: GraphEdge[] = [];

    // trigger -> http
    const step1 = canConnectEdge(sampleNodes, edges, 'trigger_1', 'http_1');
    expect(step1.allowed).toBe(true);

    edges.push({ id: 'e1', source: 'trigger_1', target: 'http_1' });

    // http -> transform
    const step2 = canConnectEdge(sampleNodes, edges, 'http_1', 'transform_1');
    expect(step2.allowed).toBe(true);

    edges.push({ id: 'e2', source: 'http_1', target: 'transform_1' });

    // transform -> output
    const step3 = canConnectEdge(sampleNodes, edges, 'transform_1', 'output_1');
    expect(step3.allowed).toBe(true);
  });

  it('refuses self-loops (source === target)', () => {
    const edges: GraphEdge[] = [];
    const result = canConnectEdge(sampleNodes, edges, 'http_1', 'http_1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Self-loops are not allowed');
  });

  it('refuses incoming edges to trigger nodes', () => {
    const edges: GraphEdge[] = [];
    const result = canConnectEdge(sampleNodes, edges, 'http_1', 'trigger_1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Trigger nodes cannot have incoming dependencies');
  });

  it('refuses duplicate edges between the same two nodes', () => {
    const edges: GraphEdge[] = [{ id: 'e1', source: 'trigger_1', target: 'http_1' }];
    const result = canConnectEdge(sampleNodes, edges, 'trigger_1', 'http_1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('already exists');
  });

  it('detects and rejects 2-node cycle (A -> B -> A)', () => {
    const edges: GraphEdge[] = [{ id: 'e1', source: 'http_1', target: 'transform_1' }];

    // Attempt to connect transform_1 back to http_1
    const result = canConnectEdge(sampleNodes, edges, 'transform_1', 'http_1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cycle detected');
    expect(result.cycle).toBeDefined();
    expect(result.cycle).toContain('http_1');
    expect(result.cycle).toContain('transform_1');
  });

  it('detects and rejects 3-node cycle (A -> B -> C -> A)', () => {
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'http_1', target: 'transform_1' },
      { id: 'e2', source: 'transform_1', target: 'delay_1' },
    ];

    // Attempt to connect delay_1 back to http_1
    const result = canConnectEdge(sampleNodes, edges, 'delay_1', 'http_1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cycle detected');
  });

  it('allows diamond branching without false positives', () => {
    // trigger -> http_1 and trigger -> delay_1
    // both http_1 and delay_1 -> transform_1 -> output_1
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'trigger_1', target: 'http_1' },
      { id: 'e2', source: 'trigger_1', target: 'delay_1' },
      { id: 'e3', source: 'http_1', target: 'transform_1' },
    ];

    // Connect delay_1 -> transform_1
    const result = canConnectEdge(sampleNodes, edges, 'delay_1', 'transform_1');
    expect(result.allowed).toBe(true);
  });

  it('validates a complete valid linear workflow graph', () => {
    const graph: Graph = {
      nodes: [
        { id: 't', type: 'trigger', config: {} },
        { id: 'h', type: 'http', config: { url: 'https://example.com' } },
        { id: 'tr', type: 'transform', config: { template: 'hello' } },
        { id: 'o', type: 'output', config: { key: 'result' } },
      ],
      edges: [
        { id: 'e1', source: 't', target: 'h' },
        { id: 'e2', source: 'h', target: 'tr' },
        { id: 'e3', source: 'tr', target: 'o' },
      ],
    };

    const errors = validateGraph(graph);
    expect(errors).toHaveLength(0);
  });

  it('catches invalid node configs during validateGraph', () => {
    const invalidGraph: Graph = {
      nodes: [
        { id: 't', type: 'trigger', config: {} },
        { id: 'h', type: 'http', config: { url: 'ftp://not-http.com' } }, // Invalid scheme
        { id: 'd', type: 'delay', config: { seconds: 120 } }, // Exceeds 60s
        { id: 'tr', type: 'transform', config: {} }, // Empty template/mapping
        { id: 'o', type: 'output', config: {} }, // Missing key
      ],
      edges: [],
    };

    const errors = validateGraph(invalidGraph);
    const codes = errors.map((e) => e.code);
    expect(codes).toContain('INVALID_CONFIG');
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
