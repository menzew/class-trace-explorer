import type { ViewNode } from '../graph/types';
import { originLabel } from '../graph/origin';
import { useDispatch } from '../state';
import { displayClassName } from '../graph/toReactFlow';
import { formatBytes } from '../graph/formatBytes';

function formatTime(ms: number): string {
  return ms < 1 ? `${Math.round(ms * 1000)} us` : `${ms.toFixed(ms < 10 ? 2 : 1)} ms`;
}

export function DetailsPanel({ node }: { node: ViewNode | undefined }) {
  const dispatch = useDispatch();
  if (!node) return null;

  const name = node.kind === 'package' ? node.package : (node.fqcn ?? node.id);
  return (
    <aside
      aria-label="Selected node details"
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        zIndex: 5,
        width: 300,
        maxHeight: 'calc(100vh - 48px)',
        overflow: 'auto',
        background: '#fffffff2',
        border: '1px solid #94a3b8',
        borderRadius: 6,
        padding: 14,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        boxShadow: '0 8px 24px #0f172a1f',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>
            {node.kind} · {originLabel(node.origin)}
          </div>
          <h2 style={{ fontSize: 15, margin: '3px 0 0', overflowWrap: 'anywhere' }}>{name}</h2>
        </div>
        <button
          type="button"
          aria-label="Close details"
          title="Close details"
          onClick={() => dispatch({ type: 'select', id: null })}
          style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 18 }}
        >
          ×
        </button>
      </div>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 12px',
          margin: '14px 0',
          fontSize: 12,
        }}
      >
        <div>
          <dt style={{ color: '#64748b' }}>Incoming</dt>
          <dd style={{ margin: 0 }}>{node.incomingCount}</dd>
        </div>
        <div>
          <dt style={{ color: '#64748b' }}>Outgoing</dt>
          <dd style={{ margin: 0 }}>{node.outgoingCount}</dd>
        </div>
        <div>
          <dt style={{ color: '#64748b' }}>Cross-package</dt>
          <dd style={{ margin: 0 }}>{node.crossPackageEdgeCount}</dd>
        </div>
        <div>
          <dt style={{ color: '#64748b' }}>Internal</dt>
          <dd style={{ margin: 0 }}>{node.internalEdgeCount}</dd>
        </div>
        {(node.hiddenEdgeCount ?? 0) > 0 && (
          <div>
            <dt style={{ color: '#64748b' }}>Hidden by filters</dt>
            <dd style={{ margin: 0 }}>{node.hiddenEdgeCount}</dd>
          </div>
        )}
        {node.classCount !== undefined && (
          <div>
            <dt style={{ color: '#64748b' }}>Classes</dt>
            <dd style={{ margin: 0 }}>{node.classCount}</dd>
          </div>
        )}
        {node.firstSeenMs !== undefined && (
          <div>
            <dt style={{ color: '#64748b' }}>First seen</dt>
            <dd style={{ margin: 0 }}>{formatTime(node.firstSeenMs)}</dd>
          </div>
        )}
        {node.loadedAtMs !== undefined && (
          <div>
            <dt style={{ color: '#64748b' }}>Loaded at</dt>
            <dd style={{ margin: 0 }}>{formatTime(node.loadedAtMs)}</dd>
          </div>
        )}
        <div>
          <dt style={{ color: '#64748b' }}>Class-file bytes</dt>
          <dd style={{ margin: 0 }}>
            {node.classFileBytes === undefined ? 'Not measured' : formatBytes(node.classFileBytes)}
          </dd>
        </div>
        {node.classCount !== undefined && (
          <div>
            <dt style={{ color: '#64748b' }}>Size coverage</dt>
            <dd style={{ margin: 0 }}>
              {node.measuredClassCount ?? 0} / {node.classCount} classes
            </dd>
          </div>
        )}
      </dl>

      {node.kind === 'type' && node.members && (
        <div style={{ marginBottom: 12 }}>
          <h3
            style={{
              fontSize: 11,
              color: '#475569',
              margin: '0 0 5px',
              textTransform: 'uppercase',
            }}
          >
            Class members
          </h3>
          {node.members.map((member) => (
            <div
              key={member}
              title={member}
              style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', marginBottom: 4 }}
            >
              {displayClassName(member)}
            </div>
          ))}
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggleType', outer: node.fqcn ?? node.id })}
            style={{ marginTop: 6 }}
          >
            Show members as nodes
          </button>
        </div>
      )}

      {node.loadSources.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h3
            style={{
              fontSize: 11,
              color: '#475569',
              margin: '0 0 5px',
              textTransform: 'uppercase',
            }}
          >
            Load source
          </h3>
          {node.loadSources.map((source) => (
            <div
              key={source}
              style={{
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                overflowWrap: 'anywhere',
              }}
            >
              {source}
            </div>
          ))}
        </div>
      )}

      {node.roles.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {node.roles.map((role) => (
            <span
              key={role}
              style={{
                background: '#ffedd5',
                color: '#9a3412',
                borderRadius: 3,
                padding: '3px 6px',
                fontSize: 10,
                textTransform: 'uppercase',
              }}
            >
              {role}
            </span>
          ))}
        </div>
      )}

      {node.sourceLocations.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: 11,
              color: '#475569',
              margin: '0 0 5px',
              textTransform: 'uppercase',
            }}
          >
            Resolution sites
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {node.sourceLocations.map((location) => (
              <li key={`${location.file}:${location.line}`}>
                {location.file}:{location.line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.annotations.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3
            style={{
              fontSize: 11,
              color: '#475569',
              margin: '0 0 5px',
              textTransform: 'uppercase',
            }}
          >
            JVM annotations
          </h3>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {node.annotations.map((annotation) => (
              <code
                key={annotation}
                style={{ background: '#e2e8f0', padding: '2px 5px', borderRadius: 3, fontSize: 10 }}
              >
                {annotation}
              </code>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: '#64748b', fontSize: 10, margin: '14px 0 0' }}>
        UNKNOWN means the trace did not provide enough source information; use app-source or
        app-prefix hints when graphing imported traces.
      </p>
    </aside>
  );
}
