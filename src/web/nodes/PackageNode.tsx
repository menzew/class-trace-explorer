import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ClgNodeData } from '../graph/toReactFlow';
import { originLabel } from '../graph/origin';
import { useDispatch } from '../state';
import { parentNamespace } from '../graph/packages';

export function PackageNode({ id, data, selected }: NodeProps) {
  const d = data as ClgNodeData;
  const dispatch = useDispatch();
  const node = d.node;
  const pkg = id.startsWith('pkg:') ? id.slice('pkg:'.length) : node.package;
  const parent = parentNamespace(pkg);
  return (
    <div
      style={{
        padding: '10px 12px',
        width: 220,
        height: 88,
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: 6,
        border: `2px solid ${selected ? '#2563eb' : '#64748b'}`,
        background: '#f1f5f9',
        opacity: d.dimmed ? 0.25 : 1,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        boxShadow: selected ? '0 0 0 2px #bfdbfe' : '0 1px 2px #0f172a12',
        position: 'relative',
      }}
      title={pkg || '(default package)'}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{d.label}</strong>
        {parent !== null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'toggleExpand', pkg: parent });
            }}
            style={{
              cursor: 'pointer',
              border: '1px solid #94a3b8',
              borderRadius: 4,
              lineHeight: 1,
            }}
            aria-label={`Collapse to namespace ${parent}`}
            title={`Collapse to ${parent}`}
          >
            -
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'toggleExpand', pkg });
          }}
          style={{ cursor: 'pointer', border: '1px solid #94a3b8', borderRadius: 4, lineHeight: 1 }}
          aria-label={`Expand namespace ${pkg || 'default package'}`}
          title={`Expand namespace ${pkg || 'default package'}`}
        >
          +
        </button>
      </div>
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
        <strong style={{ fontSize: 9 }}>{originLabel(node.origin)}</strong> ·{' '}
        <span>{d.subtitle}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 7, color: '#334155', fontSize: 10 }}>
        <span title="Incoming resolutions">← {node.incomingCount}</span>
        <span title="Outgoing resolutions">→ {node.outgoingCount}</span>
        <span title="Internal package resolutions">inside {node.internalEdgeCount}</span>
      </div>
      {d.sizeRatio > 0 && (
        <div
          title="Relative class-file footprint"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: `${Math.max(4, d.sizeRatio * 100)}%`,
            height: 3,
            background: '#2d6a8a',
          }}
        />
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
