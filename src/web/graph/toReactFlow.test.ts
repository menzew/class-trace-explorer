import { describe, it, expect } from 'vitest';
import {
  computeHighlight,
  displayClassName,
  estimateSize,
  nodeLabel,
  nodeSubtitle,
  toReactFlow,
} from './toReactFlow';
import type { ViewGraph, ViewNode } from './types';
import { MarkerType } from '@xyflow/react';

const classNode = (fqcn: string): ViewNode => ({
  id: fqcn,
  kind: 'class',
  package: 'a',
  fqcn,
  origin: 'unknown',
  incomingCount: 0,
  outgoingCount: 0,
  internalEdgeCount: 0,
  crossPackageEdgeCount: 0,
  roles: [],
  sourceLocations: [],
  annotations: [],
  loadSources: [],
});

describe('nodeLabel', () => {
  it('abbreviates class labels when requested', () => {
    expect(nodeLabel(classNode('a.b.Foo'), false)).toBe('Foo');
    expect(nodeSubtitle(classNode('a.b.Foo'), false)).toBe('a');
    expect(nodeSubtitle({ ...classNode('a.b.Foo'), package: 'a.b' }, true)).toBe('a.b');
  });

  it('gives hidden lambda classes a stable display label', () => {
    const hidden = 'org.netbeans.agent.NetBeansAgent$$Lambda/0x0000703cb4003800';
    expect(displayClassName(hidden)).toBe('NetBeansAgent lambda');
    expect(nodeLabel(classNode(hidden), false)).toBe('NetBeansAgent lambda');
  });

  it('explains anonymous and named inner-class names', () => {
    expect(displayClassName('org.netbeans.MainImpl$1')).toBe('MainImpl anonymous #1');
    expect(displayClassName('org.netbeans.MainImpl$Worker')).toBe('MainImpl.Worker');
    expect(displayClassName('org.netbeans.MainImpl$1$Task')).toBe('MainImpl anonymous #1.Task');
  });

  it('labels package nodes with name and count', () => {
    const pkg: ViewNode = {
      ...classNode('a.b.Foo'),
      id: 'pkg:a.b',
      kind: 'package',
      package: 'a.b',
      classCount: 5,
      fqcn: undefined,
    };
    expect(nodeLabel(pkg, false)).toBe('a.b');
    expect(nodeSubtitle(pkg, false)).toBe('5 classes');
    expect(nodeSubtitle({ ...pkg, classFileBytes: 1536 }, false)).toBe('5 classes · 1.5 KB');
  });
});

describe('estimateSize', () => {
  it('returns stable dimensions for enriched nodes', () => {
    const small = estimateSize('Foo');
    const big = estimateSize('a.very.long.package.Name');
    expect(big.width).toBe(small.width);
    expect(estimateSize('a.b', 'package').width).toBeGreaterThan(small.width);
    expect(small.height).toBe(88);
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

describe('class-file footprint', () => {
  it('uses square-root scaling without changing node dimensions', () => {
    const view: ViewGraph = {
      nodes: [
        { ...classNode('a.Small'), classFileBytes: 100 },
        { ...classNode('a.Large'), classFileBytes: 400 },
        classNode('a.Unknown'),
      ],
      edges: [],
    };
    const nodes = toReactFlow(view, false, null);
    expect(nodes.nodes.find((node) => node.id === 'a.Small')?.data.sizeRatio).toBe(0.5);
    expect(nodes.nodes.find((node) => node.id === 'a.Large')?.data.sizeRatio).toBe(1);
    expect(nodes.nodes.find((node) => node.id === 'a.Unknown')?.data.sizeRatio).toBe(0);
  });
});

describe('toReactFlow', () => {
  it('renders source-to-target edges with closed arrowheads', () => {
    const view: ViewGraph = {
      nodes: [classNode('a.A'), classNode('a.B')],
      edges: [{ id: 'a.A->a.B', source: 'a.A', target: 'a.B' }],
    };
    const [edge] = toReactFlow(view, false, null).edges;
    expect(edge).toMatchObject({
      source: 'a.A',
      target: 'a.B',
      markerEnd: { type: MarkerType.ArrowClosed },
    });
  });

  it('does not render thousands of edges until a node is selected', () => {
    const nodes = [classNode('a.A'), classNode('a.B'), classNode('a.C')];
    const edges = Array.from({ length: 5001 }, (_, i) => ({
      id: `edge:${i}`,
      source: i === 0 ? 'a.A' : 'a.B',
      target: i === 0 ? 'a.C' : 'a.C',
    }));
    const view: ViewGraph = { nodes, edges };

    expect(toReactFlow(view, false, null).edges).toEqual([]);
    expect(toReactFlow(view, false, 'a.A').edges.map((edge) => edge.id)).toEqual(['edge:0']);
  });
});
