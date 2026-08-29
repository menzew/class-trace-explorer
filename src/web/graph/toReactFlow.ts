import { MarkerType, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';
import type { EdgeColorMode, NodeOrigin, ViewEdge, ViewGraph, ViewNode } from './types';
import { layoutGraph } from './layout';
import { formatBytes } from './formatBytes';

const EDGE_RENDER_LIMIT = 5000;

export interface ClgNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  node: ViewNode;
  dimmed: boolean;
  sizeRatio: number;
}

export interface Highlight {
  active: boolean;
  nodes: Set<string>;
  edges: Set<string>;
}

export interface EdgePresentation {
  color: string;
  opacity: number;
  strokeWidth: number;
  strokeDasharray?: string;
}

const ORIGIN_EDGE_COLORS: Record<NodeOrigin, string> = {
  application: '#15803d',
  dependency: '#7e22ce',
  system: '#0284c7',
  unknown: '#64748b',
  mixed: '#c2410c',
};

/** Visual encoding for one directed edge in the selected edge-color mode. */
export function edgePresentation(
  edge: ViewEdge,
  mode: EdgeColorMode,
  selectedId: string | null,
  originById: ReadonlyMap<string, NodeOrigin>,
  edgeIds: ReadonlySet<string>,
): EdgePresentation {
  const incident = edge.source === selectedId || edge.target === selectedId;
  const opacity = selectedId && !incident ? 0.1 : 1;

  if (mode === 'direction') {
    if (!selectedId) return { color: '#64748b', opacity: 0.72, strokeWidth: 1.25 };
    if (!incident) return { color: '#94a3b8', opacity, strokeWidth: 1 };
    const reciprocal = edgeIds.has(`${edge.target}->${edge.source}`);
    if (reciprocal) return { color: '#7e22ce', opacity, strokeWidth: 2.25 };
    if (edge.target === selectedId) return { color: '#2563eb', opacity, strokeWidth: 2.25 };
    return { color: '#d97706', opacity, strokeWidth: 2.25 };
  }

  const sourceOrigin = originById.get(edge.source) ?? 'unknown';
  const targetOrigin = originById.get(edge.target) ?? 'unknown';
  const unknown =
    sourceOrigin === 'unknown' ||
    targetOrigin === 'unknown' ||
    sourceOrigin === 'mixed' ||
    targetOrigin === 'mixed';
  let color = ORIGIN_EDGE_COLORS[sourceOrigin];
  if (sourceOrigin === 'application' && targetOrigin === 'dependency') color = '#2563eb';
  if (sourceOrigin === 'application' && targetOrigin === 'system') color = '#64748b';
  if (sourceOrigin === 'dependency' && targetOrigin === 'application') color = '#c2410c';
  return {
    color,
    opacity,
    strokeWidth: incident ? 2.25 : 1.4,
    strokeDasharray: unknown ? '6 4' : undefined,
  };
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
  const footprint =
    node.classFileBytes === undefined ? '' : ` · ${formatBytes(node.classFileBytes)}`;
  if (node.kind === 'package') {
    const count = node.classCount ?? 0;
    return `${count} ${count === 1 ? 'class' : 'classes'}${footprint}`;
  }
  if (node.kind === 'type') {
    const count = node.classCount ?? 0;
    return `${count} ${count === 1 ? 'member' : 'members'}${footprint}`;
  }
  if (!abbrev) return `${node.package || '(default package)'}${footprint}`;
  const pkg = node.package
    .split('.')
    .filter(Boolean)
    .map((segment) => segment.charAt(0))
    .join('.');
  return `${pkg || '(default package)'}${footprint}`;
}

/** Rough node box size based on label length (dagre needs sizes up front). */
export function estimateSize(
  _label: string,
  kind: ViewNode['kind'] = 'class',
): { width: number; height: number } {
  return { width: kind === 'package' ? 240 : 220, height: 88 };
}

/** Which nodes/edges to emphasize given the selected node (its closed neighborhood). */
export function computeHighlight(
  view: ViewGraph,
  selectedId: string | null,
  selectedEdgeId: string | null = null,
): Highlight {
  if (selectedEdgeId) {
    const edge = view.edges.find((candidate) => candidate.id === selectedEdgeId);
    if (edge) {
      return {
        active: true,
        nodes: new Set([edge.source, edge.target]),
        edges: new Set([edge.id]),
      };
    }
  }
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
  edgeColorMode: EdgeColorMode = 'direction',
  selectedEdgeId: string | null = null,
): { nodes: RFNode<ClgNodeData>[]; edges: RFEdge[] } {
  const highlight = computeHighlight(view, selectedId, selectedEdgeId);
  const visibleEdges = renderableEdges(view, highlight);
  const maxClassFileBytes = Math.max(0, ...view.nodes.map((node) => node.classFileBytes ?? 0));
  const originById = new Map(view.nodes.map((node) => [node.id, node.origin]));
  const edgeIds = new Set(view.edges.map((edge) => edge.id));

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
        sizeRatio:
          n.classFileBytes === undefined || maxClassFileBytes === 0
            ? 0
            : Math.sqrt(n.classFileBytes / maxClassFileBytes),
      },
    };
  });

  const edges: RFEdge[] = visibleEdges.map((e) => {
    const presentation = edgePresentation(e, edgeColorMode, selectedId, originById, edgeIds);
    const edgeSelected = e.id === selectedEdgeId;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      ariaLabel: `${e.source} resolves ${e.target}`,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: presentation.color,
      },
      style: {
        stroke: presentation.color,
        strokeWidth: edgeSelected ? 3.5 : presentation.strokeWidth,
        strokeDasharray: presentation.strokeDasharray,
        opacity: selectedEdgeId ? (edgeSelected ? 1 : 0.08) : presentation.opacity,
      },
      selected: edgeSelected,
    };
  });

  return { nodes, edges };
}
