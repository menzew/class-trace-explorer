import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import type { ViewGraph, ViewNode } from './types';
import { dagreLayout } from './layout';

export interface ClgNodeData extends Record<string, unknown> {
  label: string;
  kind: 'package' | 'class';
  package: string;
  dimmed: boolean;
}

export interface Highlight {
  active: boolean;
  nodes: Set<string>;
  edges: Set<string>;
}

/** Human-readable label for a view node, honoring the abbreviate toggle. */
export function nodeLabel(node: ViewNode, abbrev: boolean): string {
  if (node.kind === 'package') return `${node.package} (${node.classCount ?? 0})`;
  const fqcn = node.fqcn ?? node.id;
  if (!abbrev) return fqcn;
  const simple = fqcn.slice(fqcn.lastIndexOf('.') + 1);
  const pkg = node.package
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.charAt(0))
    .join('.');
  return pkg ? `${pkg}.${simple}` : simple;
}

/** Rough node box size based on label length (dagre needs sizes up front). */
export function estimateSize(label: string): { width: number; height: number } {
  return { width: Math.max(120, label.length * 7.5 + 24), height: 40 };
}

/** Which nodes/edges to emphasize given the selected node (its closed neighborhood). */
export function computeHighlight(view: ViewGraph, selectedId: string | null): Highlight {
  if (!selectedId) return { active: false, nodes: new Set(), edges: new Set() };
  const nodes = new Set<string>([selectedId]);
  const edges = new Set<string>();
  for (const edge of view.edges) {
    if (edge.source === selectedId || edge.target === selectedId) {
      edges.add(edge.id);
      nodes.add(edge.source);
      nodes.add(edge.target);
    }
  }
  return { active: true, nodes, edges };
}

/** Convert a view graph into laid-out React Flow nodes and edges. */
export function toReactFlow(
  view: ViewGraph,
  abbrev: boolean,
  selectedId: string | null,
): { nodes: RFNode<ClgNodeData>[]; edges: RFEdge[] } {
  const highlight = computeHighlight(view, selectedId);

  const layoutInput = view.nodes.map((n) => {
    const label = nodeLabel(n, abbrev);
    return { id: n.id, ...estimateSize(label) };
  });
  const positioned = dagreLayout(layoutInput, view.edges);
  const positionById = new Map(positioned.map((p) => [p.id, p.position]));

  const nodes: RFNode<ClgNodeData>[] = view.nodes.map((n) => ({
    id: n.id,
    type: n.kind === 'package' ? 'clgPackage' : 'clgClass',
    position: positionById.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: nodeLabel(n, abbrev),
      kind: n.kind,
      package: n.package,
      dimmed: highlight.active && !highlight.nodes.has(n.id),
    },
  }));

  const edges: RFEdge[] = view.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: false,
    style: {
      opacity: highlight.active && !highlight.edges.has(e.id) ? 0.12 : 1,
    },
  }));

  return { nodes, edges };
}
