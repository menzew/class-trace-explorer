import { describe, it, expect } from 'vitest';
import { buildVisibleGraph } from './view';
import type { ViewState } from './types';
import type { GraphModel } from '../../core/types';

const base: ViewState = {
  filter: null,
  abbreviate: false,
  search: '',
  expandedPackages: new Set(),
  selectedNodeId: null,
};

const model: GraphModel = {
  classes: ['a.Foo', 'a.Bar', 'b.Baz'],
  edges: [
    { from: 'a.Foo', to: 'a.Bar' }, // intra-package a
    { from: 'a.Foo', to: 'b.Baz' }, // a -> b
  ],
};

describe('buildVisibleGraph', () => {
  it('aggregates by package by default and hides intra-package edges', () => {
    const view = buildVisibleGraph(model, base);
    expect(view.nodes.map((n) => n.id).sort()).toEqual(['pkg:a', 'pkg:b']);
    const pkgA = view.nodes.find((n) => n.id === 'pkg:a');
    expect(pkgA?.classCount).toBe(2);
    expect(view.edges).toEqual([{ id: 'pkg:a->pkg:b', source: 'pkg:a', target: 'pkg:b' }]);
  });

  it('expands a package into its class nodes and reroutes edges', () => {
    const view = buildVisibleGraph(model, {
      ...base,
      expandedPackages: new Set(['a']),
    });
    const ids = view.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['a.Bar', 'a.Foo', 'pkg:b']);
    expect(view.edges).toContainEqual({ id: 'a.Foo->a.Bar', source: 'a.Foo', target: 'a.Bar' });
    expect(view.edges).toContainEqual({ id: 'a.Foo->pkg:b', source: 'a.Foo', target: 'pkg:b' });
  });

  it('drops edges whose endpoint matches the filter substring', () => {
    const view = buildVisibleGraph(model, { ...base, filter: 'b.Baz' });
    expect(view.edges).toEqual([]); // only surviving edge is intra-package a (hidden)
    expect(view.nodes.map((n) => n.id)).toEqual(['pkg:a']);
  });
});
