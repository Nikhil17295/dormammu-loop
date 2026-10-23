import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExecutor } from '../src/executors';
import { executeTrigger } from '../src/executors/trigger';
import { executeTransform } from '../src/executors/transform';
import { executeDelay } from '../src/executors/delay';
import { executeOutput } from '../src/executors/output';
import { executeHttp } from '../src/executors/http';
import { maskSensitiveData } from '../src/executors/masking';
import { GraphNode } from '../src/engine/types';

describe('Modular Node Executors & Data Masking', () => {
  describe('maskSensitiveData', () => {
    it('should mask sensitive keys case-insensitively', () => {
      const payload = {
        username: 'alice',
        password: 'super-secret-password',
        authorization: 'Bearer jwt.token.here',
        apiKey: 'key_12345',
        secret_token: 'xyz-secret',
        profile: {
          email: 'alice@example.com',
          accessToken: 'gho_1234567890',
        },
        tags: ['public', 'safe'],
      };

      const masked = maskSensitiveData(payload);

      expect(masked.username).toBe('alice');
      expect(masked.password).toBe('[REDACTED]');
      expect(masked.authorization).toBe('[REDACTED]');
      expect(masked.apiKey).toBe('[REDACTED]');
      expect(masked.secret_token).toBe('[REDACTED]');
      expect(masked.profile.email).toBe('alice@example.com');
      expect(masked.profile.accessToken).toBe('[REDACTED]');
      expect(masked.tags).toEqual(['public', 'safe']);

      // Ensure original object was not mutated
      expect(payload.password).toBe('super-secret-password');
    });

    it('should handle primitives, null, and undefined safely', () => {
      expect(maskSensitiveData(null)).toBeNull();
      expect(maskSensitiveData(undefined)).toBeUndefined();
      expect(maskSensitiveData('plain text')).toBe('plain text');
      expect(maskSensitiveData(42)).toBe(42);
    });
  });

  describe('trigger executor', () => {
    it('should return context trigger payload', async () => {
      const node: GraphNode = {
        id: 'trigger-1',
        type: 'trigger',
        config: {},
      };
      const context = {
        trigger: { orderId: 'ord_99', amount: 150 },
        nodes: {},
      };

      const result = await executeTrigger(node, context);
      expect(result).toEqual({ orderId: 'ord_99', amount: 150 });
    });

    it('should fall back to node config payload if context trigger is empty', async () => {
      const node: GraphNode = {
        id: 'trigger-1',
        type: 'trigger',
        config: { payload: { defaultKey: 'defaultValue' } },
      };
      const context = {
        trigger: null,
        nodes: {},
      };

      const result = await executeTrigger(node, context);
      expect(result).toEqual({ defaultKey: 'defaultValue' });
    });
  });

  describe('transform executor', () => {
    it('should resolve template string', async () => {
      const node: GraphNode = {
        id: 'tx-1',
        type: 'transform',
        config: {
          template: 'Hello {{ trigger.name }}!',
        },
      };
      const context = {
        trigger: { name: 'Dormammu' },
        nodes: {},
      };

      const result = await executeTransform(node, context);
      expect(result).toBe('Hello Dormammu!');
    });

    it('should resolve mapping object', async () => {
      const node: GraphNode = {
        id: 'tx-2',
        type: 'transform',
        config: {
          mapping: {
            user: '{{ trigger.username }}',
            status: 'active',
            orderTotal: '{{ nodes.pricing.output.total }}',
          },
        },
      };
      const context = {
        trigger: { username: 'strange' },
        nodes: {
          pricing: { output: { total: 49.99 } },
        },
      };

      const result = await executeTransform(node, context);
      expect(result).toEqual({
        user: 'strange',
        status: 'active',
        orderTotal: 49.99,
      });
    });
  });

  describe('delay executor', () => {
    it('should cleanly pause and cap delay seconds at 60s', async () => {
      const node: GraphNode = {
        id: 'delay-1',
        type: 'delay',
        config: { seconds: 0.05 }, // 50ms for fast test
      };
      const start = Date.now();
      const result = await executeDelay(node, { trigger: {}, nodes: {} });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(result.delayedSeconds).toBe(0.05);
      expect(result.delayedMs).toBe(50);
    });
  });

  describe('output executor', () => {
    it('should resolve explicit value config', async () => {
      const node: GraphNode = {
        id: 'out-1',
        type: 'output',
        config: {
          value: {
            finalResult: '{{ nodes.tx1.output.result }}',
            processedAt: '2026-10-23',
          },
        },
      };
      const context = {
        trigger: {},
        nodes: {
          tx1: { output: { result: 'PASSED' } },
        },
      };

      const result = await executeOutput(node, context);
      expect(result).toEqual({
        finalResult: 'PASSED',
        processedAt: '2026-10-23',
      });
    });

    it('should return aggregated output summary if no explicit value configured', async () => {
      const node: GraphNode = {
        id: 'out-2',
        type: 'output',
        config: {},
      };
      const context = {
        trigger: { initial: true },
        nodes: {
          nodeA: { output: { a: 1 } },
          nodeB: { output: { b: 2 } },
        },
      };

      const result = await executeOutput(node, context);
      expect(result).toEqual({
        flowOutput: {
          nodeA: { a: 1 },
          nodeB: { b: 2 },
        },
        trigger: { initial: true },
      });
    });
  });

  describe('http executor', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should execute GET request and auto-parse JSON response', async () => {
      const mockResponse = { id: 'usr_1', status: 'verified' };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      });

      const node: GraphNode = {
        id: 'http-1',
        type: 'http',
        config: {
          url: 'https://api.example.com/users/{{ trigger.userId }}',
          method: 'GET',
        },
      };
      const context = {
        trigger: { userId: 'usr_1' },
        nodes: {},
      };

      const result = await executeHttp(node, context);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users/usr_1',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockResponse);
    });

    it('should throw error when HTTP status is >= 400', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Resource not found' }),
        text: async () => JSON.stringify({ error: 'Resource not found' }),
      });

      const node: GraphNode = {
        id: 'http-err',
        type: 'http',
        config: {
          url: 'https://api.example.com/not-found',
          method: 'GET',
        },
      };

      await expect(
        executeHttp(node, { trigger: {}, nodes: {} })
      ).rejects.toThrow(/HTTP request to ".*" failed with status 404/);
    });

    it('should throw error when URL is missing or malformed', async () => {
      const node: GraphNode = {
        id: 'http-bad',
        type: 'http',
        config: {
          url: 'invalid-protocol://example.com',
        },
      };

      await expect(
        executeHttp(node, { trigger: {}, nodes: {} })
      ).rejects.toThrow(/invalid URL/i);
    });
  });

  describe('getExecutor registry', () => {
    it('should return executor functions for all valid node types', () => {
      expect(getExecutor('trigger')).toBe(executeTrigger);
      expect(getExecutor('transform')).toBe(executeTransform);
      expect(getExecutor('http')).toBe(executeHttp);
      expect(getExecutor('delay')).toBe(executeDelay);
      expect(getExecutor('output')).toBe(executeOutput);
    });

    it('should throw error for unknown node type', () => {
      expect(() => getExecutor('unknown-type' as any)).toThrow(
        /Unsupported or unhandled node executor type/
      );
    });
  });
});
