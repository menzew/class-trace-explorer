import { describe, it, expect } from 'vitest';
import { computeHighlight, estimateSize, nodeLabel } from './toReactFlow';
import type { ViewGraph, ViewNode } from './types';

const classNode = (fqcn: string): ViewNode => ({
  id: fqcn,
  kind: 'class',
  package: 'a',
  fqcn,
});

describe('nodeLabel', () => {
  it('abbreviates class labels when requested', () => {
    expect(nodeLabel(classNode('a.b.Foo'), false)).toBe('a.b.Foo');
    expect(nodeLabel(classNode('a.b.Foo'), true)).toBe('a.Foo');
  });

  it('labels package nodes with name and count', () => {
    const pkg: ViewNode = { id: 'pkg:a.b', kind: 'package', package: 'a.b', classCount: 5 };
    expect(nodeLabel(pkg, false)).toBe('a.b (5)');
  });
});

describe('estimateSize', () => {
  it('returns a width that grows with label length and a fixed height', () => {
    const small = estimateSize('Foo');
    const big = estimateSize('a.very.long.package.Name');
    expect(big.width).toBeGreaterThan(small.width);
    expect(small.height).toBe(40);
  });
});

describe('computeHighlight', () => {
  const view: ViewGraph = {
    nodes: [classNode('a.A'), classNode('a.B'), classNode('a.C')],
    edges: [
      { id: 'a.A->a.B', source: 'a.A', target: 'a.B' },
      { id: 'a.B->a.C', source: 'a.B', target: 'a.C' },
    ],
  };

  it('marks nothing when there is no selection', () => {
    const h = computeHighlight(view, null);
    expect(h.active).toBe(false);
  });

  it('marks the selected node, its neighbors, and incident edges', () => {
    const h = computeHighlight(view, 'a.B');
    expect(h.active).toBe(true);
    expect([...h.nodes].sort()).toEqual(['a.A', 'a.B', 'a.C']);
    expect([...h.edges].sort()).toEqual(['a.A->a.B', 'a.B->a.C']);
  });
});
