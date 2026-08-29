import { MarkerType, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';
import type { ViewEdge, ViewGraph, ViewNode } from './types';
import { layoutGraph } from './layout';

const EDGE_RENDER_LIMIT = 5000;

export interface ClgNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  node: ViewNode;
  dimmed: boolean;
}

export interface Highlight {
  active: boolean;
  nodes: Set<string>;
  edges: Set<string>;
}

/** Stable display name for JVM-generated hidden lambda classes. */
export function displayClassName(fqcn: string): string {
  const simpleName = fqcn.slice(fqcn.lastIndexOf('.') + 1);
  const hiddenLambda = simpleName.match(/^(.*?)\$\$Lambda(?:\$\d+)?\/0x[0-9a-f]+$/i);
  if (hiddenLambda) return `${hiddenLambda[1]} lambda`;
  const anonymous = simpleName.match(/^(.*?)\$(\d+)(?:\$(.*))?$/);
  if (anonymous) {
    const nested = anonymous[3] ? `.${anonymous[3].replaceAll('$', '.')}` : '';
    return `${anonymous[1]} anonymous #${anonymous[2]}${nested}`;
  }
  return simpleName.replaceAll('$', '.');
}

/** Human-readable label for a view node, honoring the abbreviate toggle. */
export function nodeLabel(node: ViewNode, _abbrev: boolean): string {
  if (node.kind === 'package') return node.package || '(default package)';
  const fqcn = node.fqcn ?? node.id;
  return displayClassName(fqcn);
}

/** Secondary node label: package context or represented class count. */
export function nodeSubtitle(node: ViewNode, abbrev: boolean): string {
  if (node.kind === 'package') {
    const count = node.classCount ?? 0;
    return `${count} ${count === 1 ? 'class' : 'classes'}`;
  }
  if (node.kind === 'type') {
    const count = node.classCount ?? 0;
    return `${count} ${count === 1 ? 'member' : 'members'}`;
  }
  if (!abbrev) return node.package || '(default package)';
  const pkg = node.package
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.charAt(0))
    .join('.');
  return pkg || '(default package)';
}

/** Rough node box size based on label length (dagre needs sizes up front). */
export function estimateSize(
  _label: string,
  kind: ViewNode['kind'] = 'class',
): { width: number; height: number } {
  return { width: kind === 'package' ? 240 : 220, height: 88 };
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

function renderableEdges(view: ViewGraph, highlight: Highlight): ViewEdge[] {
  if (view.edges.length <= EDGE_RENDER_LIMIT) return view.edges;
  if (!highlight.active) return [];

  const edges: ViewEdge[] = [];
  for (const edge of view.edges) {
    if (!highlight.edges.has(edge.id)) continue;
    edges.push(edge);
    if (edges.length >= EDGE_RENDER_LIMIT) break;
  }
  return edges;
}

/** Convert a view graph into laid-out React Flow nodes and edges. */
export function toReactFlow(
  view: ViewGraph,
  abbrev: boolean,
  selectedId: string | null,
): { nodes: RFNode<ClgNodeData>[]; edges: RFEdge[] } {
  const highlight = computeHighlight(view, selectedId);
  const visibleEdges = renderableEdges(view, highlight);

  const layoutInput = view.nodes.map((n) => {
    const label = nodeLabel(n, abbrev);
    return { id: n.id, ...estimateSize(label, n.kind) };
  });
  const positioned = layoutGraph(layoutInput, visibleEdges);
  const positionById = new Map(positioned.map((p) => [p.id, p.position]));

  const nodes: RFNode<ClgNodeData>[] = view.nodes.map((n) => {
    const label = nodeLabel(n, abbrev);
    const size = estimateSize(label, n.kind);
    return {
      id: n.id,
      type: n.kind === 'package' ? 'clgPackage' : 'clgClass',
      position: positionById.get(n.id) ?? { x: 0, y: 0 },
      style: size,
      data: {
        label,
        subtitle: nodeSubtitle(n, abbrev),
        node: n,
        dimmed: highlight.active && !highlight.nodes.has(n.id),
      },
    };
  });

  const edges: RFEdge[] = visibleEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: '#64748b',
    },
    style: {
      stroke: '#64748b',
      strokeWidth: 1.25,
      opacity: highlight.active && !highlight.edges.has(e.id) ? 0.12 : 1,
    },
  }));

  return { nodes, edges };
}
