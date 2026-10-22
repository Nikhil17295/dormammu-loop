import { TriggerNode } from './TriggerNode';
import { HttpNode } from './HttpNode';
import { TransformNode } from './TransformNode';
import { DelayNode } from './DelayNode';
import { OutputNode } from './OutputNode';

export const nodeTypes = {
  trigger: TriggerNode,
  http: HttpNode,
  transform: TransformNode,
  delay: DelayNode,
  output: OutputNode,
};

export { TriggerNode, HttpNode, TransformNode, DelayNode, OutputNode };
