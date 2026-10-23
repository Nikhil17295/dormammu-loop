import { NodeType } from '../engine/types';
import { NodeExecutor } from './types';
import { executeTrigger } from './trigger';
import { executeTransform } from './transform';
import { executeHttp } from './http';
import { executeDelay } from './delay';
import { executeOutput } from './output';

export * from './types';
export * from './masking';
export * from './trigger';
export * from './transform';
export * from './http';
export * from './delay';
export * from './output';

const EXECUTORS: Record<NodeType, NodeExecutor> = {
  trigger: executeTrigger,
  transform: executeTransform,
  http: executeHttp,
  delay: executeDelay,
  output: executeOutput,
};

/**
 * Returns the modular executor function registered for the given node type.
 * Throws an informative error if an unknown node type is requested.
 */
export function getExecutor(type: NodeType): NodeExecutor {
  const executor = EXECUTORS[type];
  if (!executor) {
    throw new Error(`Unsupported or unhandled node executor type: "${type}"`);
  }
  return executor;
}
