import { NodeExecutor } from './types';
import { resolveTemplate } from '../engine/templating';

/**
 * Transform Node Executor
 * Transforms data from trigger and upstream node outputs using safe templating.
 */
export const executeTransform: NodeExecutor = async (node, context) => {
  const config = node.config || {};

  if (config.mapping !== undefined && config.mapping !== null) {
    return resolveTemplate(config.mapping, context);
  }

  if (config.template !== undefined && config.template !== null) {
    const resolved = resolveTemplate(config.template, context);
    if (typeof resolved === 'string') {
      const trimmed = resolved.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return resolved;
        }
      }
    }
    return resolved;
  }

  return {};
};
