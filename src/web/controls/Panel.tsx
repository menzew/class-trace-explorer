import type { GraphModel } from '../../core/types';
import { useDispatch, useViewState } from '../state';

export function Panel({ model }: { model: GraphModel }) {
  const state = useViewState();
  const dispatch = useDispatch();
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 5,
        background: '#ffffffee',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 240,
        fontSize: 13,
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        Filter (hide classes containing)
        <input
          value={state.filter ?? ''}
          placeholder="e.g. sun.reflect"
          onChange={(e) => dispatch({ type: 'setFilter', value: e.target.value })}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        Search (highlight)
        <input
          value={state.search}
          placeholder="locate a class/package"
          onChange={(e) => dispatch({ type: 'setSearch', value: e.target.value })}
        />
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={state.abbreviate}
          onChange={() => dispatch({ type: 'toggleAbbreviate' })}
        />
        Abbreviate (java.lang. → j.l.)
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => dispatch({ type: 'expandAll', model })}>
          Expand all
        </button>
        <button type="button" onClick={() => dispatch({ type: 'collapseAll' })}>
          Collapse all
        </button>
      </div>
    </div>
  );
}
