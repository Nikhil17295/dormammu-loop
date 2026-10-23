import { NodeExecutor } from './types';
import { resolveTemplate } from '../engine/templating';

/**
 * Output Node Executor
 * Emits the workflow's final result or resolved output values.
 */
export const executeOutput: NodeExecutor = async (node, context) => {
  const config = node.config || {};

  if (config.value !== undefined) {
    return resolveTemplate(config.value, context);
  }

  if (config.template !== undefined) {
    return resolveTemplate(config.template, context);
  }

  if (config.mapping !== undefined) {
    return resolveTemplate(config.mapping, context);
  }

  if (config.payload !== undefined) {
    return resolveTemplate(config.payload, context);
  }

  if (config.key && config.key.trim().length > 0) {
    return {
      key: config.key,
      name: config.name || node.name || node.id,
      data: context.trigger ?? {},
    };
  }

  // Default: Return summary of upstream outputs
  const summary: Record<string, any> = {};
  for (const [nodeId, nodeData] of Object.entries(context.nodes)) {
    summary[nodeId] = nodeData.output;
  }

  return {
    flowOutput: summary,
    trigger: context.trigger,
  };
};
