import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ClgNodeData } from '../graph/toReactFlow';
import { originColors, originLabel } from '../graph/origin';
import { useDispatch } from '../state';

export function ClassNode({ data, selected }: NodeProps) {
  const d = data as ClgNodeData;
  const node = d.node;
  const dispatch = useDispatch();
  const origin = originColors(node.origin);
  return (
    <div
      style={{
        padding: '9px 11px',
        width: 200,
        height: 88,
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${selected ? '#2563eb' : '#94a3b8'}`,
        background: '#ffffff',
        opacity: d.dimmed ? 0.25 : 1,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        boxShadow: selected ? '0 0 0 2px #bfdbfe' : '0 1px 2px #0f172a12',
      }}
      title={node.fqcn}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 13, overflowWrap: 'anywhere', lineHeight: 1.15 }}>
          {d.label}
        </strong>
        {node.kind === 'type' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              dispatch({ type: 'select', id: node.id });
            }}
            style={{
              cursor: 'pointer',
              border: '1px solid #94a3b8',
              borderRadius: 4,
              lineHeight: 1,
            }}
            aria-label={`View inner classes of ${node.fqcn}`}
            title={`View members of ${node.fqcn}`}
          >
            ...
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (node.groupedOuter) dispatch({ type: 'toggleType', outer: node.groupedOuter });
              else dispatch({ type: 'toggleExpand', pkg: node.package });
            }}
            style={{
              cursor: 'pointer',
              border: '1px solid #94a3b8',
              borderRadius: 4,
              lineHeight: 1,
            }}
            aria-label={
              node.groupedOuter
                ? `Collapse inner classes of ${node.groupedOuter}`
                : `Collapse package ${node.package || 'default package'}`
            }
            title={node.groupedOuter ? `Collapse ${node.groupedOuter}` : `Collapse ${node.package}`}
          >
            -
          </button>
        )}
      </div>
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2, overflowWrap: 'anywhere' }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: 3,
            color: origin.color,
            background: origin.background,
          }}
        >
          {originLabel(node.origin)}
        </span>{' '}
        · {d.subtitle}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 7, color: '#334155', fontSize: 10 }}>
        <span title="Incoming resolutions">← {node.incomingCount}</span>
        <span title="Outgoing resolutions">→ {node.outgoingCount}</span>
        {node.roles.slice(0, 2).map((role) => (
          <span key={role} style={{ color: '#7c2d12', textTransform: 'uppercase', fontSize: 9 }}>
            {role}
          </span>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
