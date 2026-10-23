import { NodeExecutor } from './types';

/**
 * Delay Node Executor
 * Pauses execution cleanly via a timer promise. Capped at 60 seconds maximum.
 */
export const executeDelay: NodeExecutor = async (node, _context) => {
  const config = node.config || {};
  let ms = 1000;

  if (typeof config.seconds === 'number') {
    const clampedSec = Math.max(0, Math.min(config.seconds, 60));
    ms = clampedSec * 1000;
  } else if (typeof config.ms === 'number') {
    ms = Math.max(0, Math.min(config.ms, 60000));
  }

  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  return {
    delayedMs: ms,
    delayedSeconds: ms / 1000,
    timestamp: new Date().toISOString(),
  };
};
