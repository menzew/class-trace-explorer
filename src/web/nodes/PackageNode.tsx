import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ClgNodeData } from '../graph/toReactFlow';
import { useDispatch } from '../state';

export function PackageNode({ id, data, selected }: NodeProps) {
  const d = data as ClgNodeData;
  const dispatch = useDispatch();
  const pkg = id.startsWith('pkg:') ? id.slice('pkg:'.length) : d.package;
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: `2px solid ${selected ? '#2563eb' : '#64748b'}`,
        background: '#f1f5f9',
        fontSize: 13,
        fontWeight: 600,
        opacity: d.dimmed ? 0.25 : 1,
        whiteSpace: 'nowrap',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
      title={`${pkg} — click + to expand`}
    >
      <Handle type="target" position={Position.Top} />
      <span>{d.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dispatch({ type: 'toggleExpand', pkg });
        }}
        style={{ cursor: 'pointer', border: '1px solid #94a3b8', borderRadius: 4, lineHeight: 1 }}
        aria-label={`Expand package ${pkg}`}
      >
        +
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
