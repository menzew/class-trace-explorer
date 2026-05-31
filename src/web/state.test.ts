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
    expect(s.expandedPackages.size).toBe(0);
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

  it('sets filter and selection', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'setFilter', value: 'foo' });
    expect(s.filter).toBe('foo');
    s = reduce(s, { type: 'select', id: 'a.A' });
    expect(s.selectedNodeId).toBe('a.A');
  });
});
