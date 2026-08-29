import type { GraphModel } from '../../core/types';
import { useDispatch, useViewState } from '../state';
import { originLabel } from '../graph/origin';
import type { ClassOrigin } from '../../core/types';
import { useEffect, useMemo, useState } from 'react';
import { packageOf } from '../graph/packages';
import { classifyOrigin } from '../../core/classOrigin';

const ORIGINS: ClassOrigin[] = ['application', 'system', 'dependency', 'unknown'];

export function Panel({ model }: { model: GraphModel }) {
  const state = useViewState();
  const dispatch = useDispatch();
  const [draftOrigins, setDraftOrigins] = useState(() => new Set(state.visibleOrigins));
  useEffect(() => setDraftOrigins(new Set(state.visibleOrigins)), [state.visibleOrigins]);
  const originsChanged = ORIGINS.some(
    (origin) => draftOrigins.has(origin) !== state.visibleOrigins.has(origin),
  );
  const normalizedFilter = state.filter?.trim().toLocaleLowerCase() ?? '';
  const hiddenCount = useMemo(
    () =>
      normalizedFilter
        ? model.classes.filter((fqcn) => fqcn.toLocaleLowerCase().includes(normalizedFilter)).length
        : 0,
    [model.classes, normalizedFilter],
  );
  const matches = useMemo(() => {
    const query = state.search.trim().toLocaleLowerCase();
    if (query.length < 2) return { packages: [] as string[], classes: [] as string[] };
    const packages = new Set<string>();
    const classes: string[] = [];
    for (const fqcn of model.classes) {
      if (normalizedFilter && fqcn.toLocaleLowerCase().includes(normalizedFilter)) continue;
      const origin = model.classInfo?.[fqcn]?.origin ?? classifyOrigin({ name: fqcn });
      if (!state.visibleOrigins.has(origin)) continue;
      const pkg = packageOf(fqcn);
      if (pkg.toLocaleLowerCase().includes(query)) packages.add(pkg);
      if (fqcn.toLocaleLowerCase().includes(query) && classes.length < 5) classes.push(fqcn);
      if (packages.size >= 3 && classes.length >= 5) break;
    }
    return { packages: [...packages].slice(0, 3), classes };
  }, [model, normalizedFilter, state.search, state.visibleOrigins]);
  const hasMatches = matches.packages.length > 0 || matches.classes.length > 0;
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
        Exclude by name
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            value={state.filter ?? ''}
            placeholder="e.g. sun.reflect"
            onChange={(e) => dispatch({ type: 'setFilter', value: e.target.value })}
            style={{ minWidth: 0, flex: 1 }}
          />
          {state.filter && (
            <button type="button" onClick={() => dispatch({ type: 'setFilter', value: '' })}>
              Clear
            </button>
          )}
        </div>
        {normalizedFilter && (
          <span style={{ color: hiddenCount ? '#475569' : '#b91c1c', fontSize: 11 }}>
            {hiddenCount} {hiddenCount === 1 ? 'class' : 'classes'} excluded
          </span>
        )}
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ marginBottom: 3 }}>Show origins</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
          {ORIGINS.map((origin) => (
            <label key={origin} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={draftOrigins.has(origin)}
                onChange={() => {
                  setDraftOrigins((current) => {
                    const next = new Set(current);
                    if (next.has(origin)) next.delete(origin);
                    else next.add(origin);
                    return next;
                  });
                }}
              />
              {originLabel(origin)}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={!originsChanged}
          onClick={() =>
            dispatch({
              type: 'setOrigins',
              origins: ORIGINS.filter((origin) => draftOrigins.has(origin)),
            })
          }
          style={{ marginTop: 6, width: '100%' }}
        >
          Apply origin filters
        </button>
      </fieldset>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        Find class or namespace
        <input
          value={state.search}
          placeholder="locate a class/package"
          onChange={(e) => dispatch({ type: 'setSearch', value: e.target.value })}
        />
      </label>
      {state.search.trim().length >= 2 && (
        <div
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          {!hasMatches && <div style={{ padding: 7, color: '#b91c1c' }}>No matches</div>}
          {matches.packages.map((pkg) => (
            <button
              type="button"
              key={`pkg:${pkg}`}
              onClick={() => dispatch({ type: 'revealNamespace', pkg })}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 0,
                padding: 7,
                background: '#fff',
              }}
            >
              <strong>Namespace</strong> {pkg}
            </button>
          ))}
          {matches.classes.map((fqcn) => (
            <button
              type="button"
              key={fqcn}
              onClick={() => dispatch({ type: 'revealClass', fqcn })}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 0,
                padding: 7,
                background: '#fff',
              }}
            >
              <strong>Class</strong> {fqcn}
            </button>
          ))}
        </div>
      )}
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
