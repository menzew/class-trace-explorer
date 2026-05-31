import dagre from '@dagrejs/dagre';

export interface LayoutInput {
  id: string;
  width: number;
  height: number;
}

export interface Positioned extends LayoutInput {
  position: { x: number; y: number };
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

/** Lay nodes out top-to-bottom with dagre, returning React-Flow-style positions. */
export function dagreLayout(
  nodes: LayoutInput[],
  edges: LayoutEdge[],
  rankdir: 'TB' | 'LR' = 'TB',
): Positioned[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 });

  for (const node of nodes) g.setNode(node.id, { width: node.width, height: node.height });
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // dagre centers nodes; React Flow positions by top-left corner.
  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return { ...node, position: { x: x - node.width / 2, y: y - node.height / 2 } };
  });
}
