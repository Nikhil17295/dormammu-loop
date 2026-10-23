import { NodeExecutor } from './types';

/**
 * Trigger Node Executor
 * Returns the incoming trigger payload that initiated the workflow run.
 */
export const executeTrigger: NodeExecutor = async (node, context) => {
  // If the run provided a trigger payload in context, use it.
  // Otherwise fallback to any default mock payload configured on the node.
  if (context.trigger !== undefined && context.trigger !== null) {
    return context.trigger;
  }
  return node.config?.payload ?? {};
};
