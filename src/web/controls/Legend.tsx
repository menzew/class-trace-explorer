import { useViewState } from '../state';

function EdgeKey({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        aria-hidden="true"
        style={{
          width: 18,
          borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
        }}
      />
      {label}
    </span>
  );
}

export function Legend() {
  const { edgeColorMode } = useViewState();
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 5,
        background: '#ffffffee',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        maxWidth: 260,
      }}
    >
      <strong>ClassTrace Explorer</strong>
      <div>A → B : class A resolves class B</div>
      <div style={{ marginTop: 4, color: '#475569' }}>
        Boxes are packages by default; click <code>+</code> to expand into classes.
      </div>
      <div style={{ marginTop: 4, color: '#475569' }}>
        Origin: SYSTEM · APP · DEPENDENCY · UNKNOWN · MIXED
      </div>
      <div style={{ display: 'flex', gap: '4px 10px', flexWrap: 'wrap', marginTop: 5 }}>
        {edgeColorMode === 'direction' ? (
          <>
            <EdgeKey color="#2563eb" label="Incoming" />
            <EdgeKey color="#d97706" label="Outgoing" />
            <EdgeKey color="#7e22ce" label="Reciprocal" />
          </>
        ) : (
          <>
            <EdgeKey color="#15803d" label="Application" />
            <EdgeKey color="#7e22ce" label="Dependency" />
            <EdgeKey color="#0284c7" label="System" />
            <EdgeKey color="#64748b" label="Unknown" dashed />
          </>
        )}
      </div>
    </div>
  );
}
