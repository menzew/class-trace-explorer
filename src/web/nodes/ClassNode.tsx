import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ClgNodeData } from '../graph/toReactFlow';

export function ClassNode({ data, selected }: NodeProps) {
  const d = data as ClgNodeData;
  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        border: `1px solid ${selected ? '#2563eb' : '#94a3b8'}`,
        background: '#ffffff',
        fontSize: 12,
        fontFamily: 'ui-monospace, monospace',
        opacity: d.dimmed ? 0.25 : 1,
        whiteSpace: 'nowrap',
      }}
      title={d.label}
    >
      <Handle type="target" position={Position.Top} />
      {d.label}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
