import { describe, it, expect } from 'vitest';
import { reduce, initialState } from './state';
import type { GraphModel } from '../core/types';

const model: GraphModel = {
  classes: ['a.A', 'b.B'],
  edges: [{ from: 'a.A', to: 'b.B' }],
};

describe('reduce', () => {
  it('seeds filter/abbreviate from embedded opts', () => {
    const s = initialState({ abbreviate: true, filter: 'x' });
    expect(s.abbreviate).toBe(true);
    expect(s.filter).toBe('x');
    expect([...s.visibleOrigins]).toEqual(['application', 'system', 'dependency', 'unknown']);
    expect(s.expandedPackages.size).toBe(0);
    expect(s.expandedTypes.size).toBe(0);
  });

  it('toggles a package in expandedPackages', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'toggleExpand', pkg: 'a' });
    expect(s.expandedPackages.has('a')).toBe(true);
    s = reduce(s, { type: 'toggleExpand', pkg: 'a' });
    expect(s.expandedPackages.has('a')).toBe(false);
  });

  it('expandAll fills from the model packages, collapseAll clears', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'expandAll', model });
    expect([...s.expandedPackages].sort()).toEqual(['a', 'b']);
    s = reduce(s, { type: 'collapseAll' });
    expect(s.expandedPackages.size).toBe(0);
  });

  it('expands all namespace levels and collapses descendants with their parent', () => {
    const nested: GraphModel = {
      classes: ['org.eclipse.core.Main'],
      edges: [],
    };
    let s = reduce(initialState({ abbreviate: false, filter: null }), {
      type: 'expandAll',
      model: nested,
    });
    expect([...s.expandedPackages]).toEqual(['org', 'org.eclipse', 'org.eclipse.core']);
    s = reduce(s, { type: 'toggleExpand', pkg: 'org' });
    expect(s.expandedPackages.size).toBe(0);
  });

  it('sets filter and selection', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'setFilter', value: 'foo' });
    expect(s.filter).toBe('foo');
    s = reduce(s, { type: 'select', id: 'a.A' });
    expect(s.selectedNodeId).toBe('a.A');
  });

  it('toggles an origin and clears a stale selection', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = { ...s, selectedNodeId: 'pkg:java' };
    s = reduce(s, { type: 'toggleOrigin', origin: 'system' });
    expect(s.visibleOrigins.has('system')).toBe(false);
    expect(s.selectedNodeId).toBeNull();
  });

  it('applies a complete set of staged origin selections', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = { ...s, selectedNodeId: 'pkg:java' };
    s = reduce(s, { type: 'setOrigins', origins: ['application', 'dependency'] });
    expect([...s.visibleOrigins]).toEqual(['application', 'dependency']);
    expect(s.selectedNodeId).toBeNull();
  });

  it('reveals a namespace path or a concrete class', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'revealNamespace', pkg: 'org.eclipse.core' });
    expect([...s.expandedPackages]).toEqual(['org', 'org.eclipse']);
    expect(s.selectedNodeId).toBe('pkg:org.eclipse.core');

    s = reduce(s, { type: 'revealClass', fqcn: 'org.eclipse.core.Main' });
    expect([...s.expandedPackages]).toEqual(['org', 'org.eclipse', 'org.eclipse.core']);
    expect(s.selectedNodeId).toBe('org.eclipse.core.Main');
    expect(s.expandedTypes.has('org.eclipse.core.Main')).toBe(true);
  });

  it('toggles an outer type group', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'toggleType', outer: 'app.Outer' });
    expect(s.expandedTypes.has('app.Outer')).toBe(true);
    s = reduce(s, { type: 'toggleType', outer: 'app.Outer' });
    expect(s.expandedTypes.has('app.Outer')).toBe(false);
  });
});
