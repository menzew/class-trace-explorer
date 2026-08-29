import { describe, it, expect } from 'vitest';
import { buildVisibleGraph } from './view';
import type { ViewState } from './types';
import type { GraphModel } from '../../core/types';

const base: ViewState = {
  filter: null,
  visibleOrigins: new Set(['application', 'system', 'dependency', 'unknown']),
  abbreviate: false,
  search: '',
  expandedPackages: new Set(),
  expandedTypes: new Set(),
  selectedNodeId: null,
};

const model: GraphModel = {
  classes: ['a.Foo', 'a.Bar', 'b.Baz'],
  edges: [
    { from: 'a.Foo', to: 'a.Bar', timestampMs: 4, sourceFile: 'Foo.java', sourceLine: 3 },
    { from: 'a.Foo', to: 'b.Baz', timestampMs: 8 },
  ],
};

describe('buildVisibleGraph', () => {
  it('aggregates by package by default and hides intra-package edges', () => {
    const view = buildVisibleGraph(model, base);
    expect(view.nodes.map((n) => n.id).sort()).toEqual(['pkg:a', 'pkg:b']);
    const pkgA = view.nodes.find((n) => n.id === 'pkg:a');
    expect(pkgA?.classCount).toBe(2);
    expect(pkgA).toMatchObject({
      origin: 'unknown',
      outgoingCount: 1,
      internalEdgeCount: 1,
      crossPackageEdgeCount: 1,
      firstSeenMs: 4,
      roles: ['entry', 'bridge'],
      sourceLocations: [{ file: 'Foo.java', line: 3 }],
      annotations: [],
      loadSources: [],
    });
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
    expect(view.nodes.find((n) => n.id === 'a.Foo')).toMatchObject({
      outgoingCount: 2,
      incomingCount: 0,
      roles: ['entry', 'bridge'],
    });
    expect(view.nodes.find((n) => n.id === 'a.Bar')?.roles).toContain('leaf');
  });

  it('expands namespaces one segment at a time before revealing classes', () => {
    const nested: GraphModel = {
      classes: ['org.eclipse.core.Main', 'org.netbeans.api.Window', 'com.google.common.Lists'],
      edges: [
        { from: 'org.eclipse.core.Main', to: 'org.netbeans.api.Window' },
        { from: 'org.netbeans.api.Window', to: 'com.google.common.Lists' },
      ],
    };

    expect(
      buildVisibleGraph(nested, base)
        .nodes.map((node) => node.id)
        .sort(),
    ).toEqual(['pkg:com', 'pkg:org']);
    expect(
      buildVisibleGraph(nested, { ...base, expandedPackages: new Set(['org']) })
        .nodes.map((node) => node.id)
        .sort(),
    ).toEqual(['pkg:com', 'pkg:org.eclipse', 'pkg:org.netbeans']);
    expect(
      buildVisibleGraph(nested, {
        ...base,
        expandedPackages: new Set(['org', 'org.eclipse', 'org.eclipse.core']),
      }).nodes.map((node) => node.id),
    ).toContain('org.eclipse.core.Main');
  });

  it('groups inner classes under their outer type and expands them on demand', () => {
    const innerModel: GraphModel = {
      classes: ['app.Outer', 'app.Outer$Inner', 'app.Outer$1', 'app.Other'],
      edges: [
        { from: 'app.Outer', to: 'app.Outer$Inner' },
        { from: 'app.Outer$Inner', to: 'app.Other' },
      ],
    };
    const grouped = buildVisibleGraph(innerModel, {
      ...base,
      expandedPackages: new Set(['app']),
    });
    expect(grouped.nodes.map((node) => node.id).sort()).toEqual(['app.Other', 'type:app.Outer']);
    expect(grouped.nodes.find((node) => node.id === 'type:app.Outer')).toMatchObject({
      kind: 'type',
      classCount: 3,
      internalEdgeCount: 1,
      members: ['app.Outer', 'app.Outer$1', 'app.Outer$Inner'],
    });

    const expanded = buildVisibleGraph(innerModel, {
      ...base,
      expandedPackages: new Set(['app']),
      expandedTypes: new Set(['app.Outer']),
    });
    expect(expanded.nodes.map((node) => node.id).sort()).toEqual([
      'app.Other',
      'app.Outer',
      'app.Outer$1',
      'app.Outer$Inner',
    ]);
  });

  it('drops edges whose endpoint matches the filter substring', () => {
    const view = buildVisibleGraph(model, { ...base, filter: 'b.Baz' });
    expect(view.edges).toEqual([]); // only surviving edge is intra-package a (hidden)
    expect(view.nodes.map((n) => n.id)).toEqual(['pkg:a']);
  });

  it('filters classes case-insensitively and retains unrelated isolated classes', () => {
    const view = buildVisibleGraph(model, { ...base, filter: 'B.BAZ' });
    expect(view.nodes.map((node) => node.id)).toEqual(['pkg:a']);
    expect(view.nodes[0].classCount).toBe(2);
  });

  it('classifies standard runtime packages as system classes', () => {
    const view = buildVisibleGraph(
      {
        classes: ['app.Main', 'java.lang.String'],
        edges: [{ from: 'app.Main', to: 'java.lang.String' }],
      },
      base,
    );
    expect(view.nodes.find((n) => n.id === 'pkg:java')?.origin).toBe('system');
  });

  it('aggregates source-backed application and dependency origins', () => {
    const view = buildVisibleGraph(
      {
        classes: ['app.Main', 'org.lib.Type'],
        edges: [{ from: 'app.Main', to: 'org.lib.Type' }],
        classInfo: {
          'app.Main': {
            name: 'app.Main',
            origin: 'application',
            source: 'file:/work/classes/',
            timestampMs: 2,
          },
          'org.lib.Type': {
            name: 'org.lib.Type',
            origin: 'dependency',
            source: 'file:/deps/lib.jar',
            timestampMs: 3,
          },
        },
      },
      base,
    );
    expect(view.nodes.find((n) => n.id === 'pkg:app')).toMatchObject({
      origin: 'application',
      loadSources: ['file:/work/classes/'],
      loadedAtMs: 2,
    });
    expect(view.nodes.find((n) => n.id === 'pkg:org')?.origin).toBe('dependency');
  });

  it('removes hidden origins before aggregating namespaces and edges', () => {
    const originModel: GraphModel = {
      classes: ['app.Main', 'java.lang.String', 'org.lib.Type'],
      edges: [
        { from: 'app.Main', to: 'java.lang.String' },
        { from: 'app.Main', to: 'org.lib.Type' },
      ],
      classInfo: {
        'app.Main': { name: 'app.Main', origin: 'application' },
        'java.lang.String': { name: 'java.lang.String', origin: 'system' },
        'org.lib.Type': { name: 'org.lib.Type', origin: 'dependency' },
      },
    };
    const view = buildVisibleGraph(originModel, {
      ...base,
      visibleOrigins: new Set(['application', 'dependency']),
    });
    expect(view.nodes.map((node) => node.id).sort()).toEqual(['pkg:app', 'pkg:org']);
    expect(view.edges).toEqual([{ id: 'pkg:app->pkg:org', source: 'pkg:app', target: 'pkg:org' }]);
    expect(view.nodes.find((node) => node.id === 'pkg:app')).toMatchObject({
      outgoingCount: 2,
      hiddenEdgeCount: 1,
    });
  });
});
