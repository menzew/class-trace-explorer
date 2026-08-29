export function Legend() {
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
    </div>
  );
}
