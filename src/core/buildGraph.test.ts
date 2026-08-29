import { describe, it, expect } from 'vitest';
import { buildGraph } from './buildGraph';

describe('buildGraph', () => {
  it('deduplicates identical from->to edges', () => {
    const model = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'B' },
    ]);
    expect(model.edges).toEqual([{ from: 'A', to: 'B', occurrences: 2 }]);
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

  it('preserves metadata from the first observed resolution', () => {
    const model = buildGraph([
      { from: 'A', to: 'B', timestampMs: 12, sourceFile: 'A.java', sourceLine: 7 },
    ]);
    expect(model.edges[0]).toMatchObject({
      timestampMs: 12,
      sourceFile: 'A.java',
      sourceLine: 7,
    });
  });

  it('attaches source-backed class origin metadata', () => {
    const model = buildGraph(
      [{ from: 'app.Main', to: 'org.lib.Type' }],
      [
        { name: 'app.Main', source: 'file:/work/classes/' },
        { name: 'org.lib.Type', source: 'file:/deps/lib.jar' },
      ],
      { appSources: ['/work/classes'] },
    );
    expect(model.classInfo?.['app.Main'].origin).toBe('application');
    expect(model.classInfo?.['org.lib.Type'].origin).toBe('dependency');
  });
});
