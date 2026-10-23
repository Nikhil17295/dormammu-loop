import { describe, it, expect } from 'vitest';
import { resolveTemplate, getByPath } from '../src/engine/templating';

describe('Safe Variable Templating Engine', () => {
  describe('getByPath', () => {
    const context = {
      user: {
        id: 123,
        name: 'Alice',
        address: {
          city: 'Wonderland',
          zip: 99999,
        },
        tags: ['admin', 'developer', 'mentor'],
      },
      flag: true,
      count: 0,
    };

    it('should retrieve top-level properties', () => {
      expect(getByPath(context, 'flag')).toBe(true);
      expect(getByPath(context, 'count')).toBe(0);
    });

    it('should retrieve deep nested properties', () => {
      expect(getByPath(context, 'user.name')).toBe('Alice');
      expect(getByPath(context, 'user.address.city')).toBe('Wonderland');
      expect(getByPath(context, 'user.address.zip')).toBe(99999);
    });

    it('should support array index access via bracket and dot syntax', () => {
      expect(getByPath(context, 'user.tags[0]')).toBe('admin');
      expect(getByPath(context, 'user.tags[1]')).toBe('developer');
      expect(getByPath(context, 'user.tags.2')).toBe('mentor');
    });

    it('should return undefined for missing paths without crashing', () => {
      expect(getByPath(context, 'user.nonExistent')).toBeUndefined();
      expect(getByPath(context, 'user.address.country.code')).toBeUndefined();
      expect(getByPath(null, 'foo.bar')).toBeUndefined();
      expect(getByPath(undefined, 'foo.bar')).toBeUndefined();
    });

    it('should block prototype pollution properties', () => {
      expect(getByPath(context, '__proto__')).toBeUndefined();
      expect(getByPath(context, 'user.__proto__')).toBeUndefined();
      expect(getByPath(context, 'constructor')).toBeUndefined();
      expect(getByPath(context, 'prototype')).toBeUndefined();
    });
  });

  describe('resolveTemplate', () => {
    const context = {
      trigger: {
        userId: 'usr_888',
        amount: 250.5,
        isActive: false,
        metadata: {
          role: 'engineer',
          region: 'ap-south-1',
        },
        items: [
          { sku: 'ITEM-1', qty: 2 },
          { sku: 'ITEM-2', qty: 5 },
        ],
      },
      nodes: {
        stepA: {
          output: {
            score: 95,
            message: 'All checks passed',
          },
        },
      },
    };

    it('should preserve native types when expression is the entire string', () => {
      expect(resolveTemplate('{{ trigger.userId }}', context)).toBe('usr_888');
      expect(resolveTemplate('{{ trigger.amount }}', context)).toBe(250.5);
      expect(resolveTemplate('{{ trigger.isActive }}', context)).toBe(false);
      expect(resolveTemplate('{{ trigger.metadata }}', context)).toEqual({
        role: 'engineer',
        region: 'ap-south-1',
      });
      expect(resolveTemplate('{{ trigger.items }}', context)).toEqual([
        { sku: 'ITEM-1', qty: 2 },
        { sku: 'ITEM-2', qty: 5 },
      ]);
    });

    it('should tolerate leading and trailing spaces inside expression delimiters', () => {
      expect(resolveTemplate('{{   trigger.userId   }}', context)).toBe('usr_888');
      expect(resolveTemplate('{{trigger.amount}}', context)).toBe(250.5);
    });

    it('should interpolate multiple variables inside strings', () => {
      const template = 'User {{ trigger.userId }} ({{ trigger.metadata.role }}) scored {{ nodes.stepA.output.score }}';
      expect(resolveTemplate(template, context)).toBe(
        'User usr_888 (engineer) scored 95'
      );
    });

    it('should safely replace missing paths with empty string during interpolation', () => {
      const template = 'Status: {{ trigger.missingProp }} (code: {{ trigger.unknown.nested }})';
      expect(resolveTemplate(template, context)).toBe('Status:  (code: )');
    });

    it('should resolve expressions within objects and arrays recursively', () => {
      const mapping = {
        id: '{{ trigger.userId }}',
        total: '{{ trigger.amount }}',
        tags: ['{{ trigger.metadata.role }}', 'static-tag'],
        nested: {
          msg: '{{ nodes.stepA.output.message }}',
        },
      };

      expect(resolveTemplate(mapping, context)).toEqual({
        id: 'usr_888',
        total: 250.5,
        tags: ['engineer', 'static-tag'],
        nested: {
          msg: 'All checks passed',
        },
      });
    });

    it('should safely handle non-template literals and primitives', () => {
      expect(resolveTemplate(12345, context)).toBe(12345);
      expect(resolveTemplate(true, context)).toBe(true);
      expect(resolveTemplate(null, context)).toBeNull();
      expect(resolveTemplate(undefined, context)).toBeUndefined();
      expect(resolveTemplate('Just a plain string without mustache', context)).toBe(
        'Just a plain string without mustache'
      );
    });

    it('should never execute arbitrary code (zero eval)', () => {
      // Malicious attempt to inject JS
      const malicious = '{{ globalThis.process.exit(1) }}';
      expect(resolveTemplate(malicious, context)).toBe('');
    });
  });
});
