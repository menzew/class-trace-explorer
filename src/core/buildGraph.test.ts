import { describe, it, expect } from 'vitest';
import { buildGraph } from './buildGraph';

describe('buildGraph', () => {
  it('deduplicates identical from->to edges', () => {
    const model = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'B' },
    ]);
    expect(model.edges).toEqual([{ from: 'A', to: 'B' }]);
  });

  it('keeps distinct edges that share a target (full graph, not a tree)', () => {
    const model = buildGraph([
      { from: 'A', to: 'C' },
      { from: 'B', to: 'C' },
    ]);
    expect(model.edges).toEqual([
      { from: 'A', to: 'C' },
      { from: 'B', to: 'C' },
    ]);
  });

  it('skips edges whose target is an array type', () => {
    const model = buildGraph([
      { from: 'A', to: '[Ljava.lang.String;' },
      { from: 'A', to: 'B' },
    ]);
    expect(model.edges).toEqual([{ from: 'A', to: 'B' }]);
  });

  it('collects the unique set of class names from surviving edges', () => {
    const model = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]);
    expect([...model.classes].sort()).toEqual(['A', 'B', 'C']);
  });
});
