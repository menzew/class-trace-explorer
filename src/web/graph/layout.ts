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

export type LayoutStrategy = 'dagre' | 'grid';

const DAGRE_NODE_LIMIT = 180;
const DAGRE_EDGE_LIMIT = 800;
const GRID_CELL_GAP_X = 120;
const GRID_CELL_GAP_Y = 100;

export function chooseLayoutStrategy(nodes: LayoutInput[], edges: LayoutEdge[]): LayoutStrategy {
  if (nodes.length > DAGRE_NODE_LIMIT || edges.length > DAGRE_EDGE_LIMIT) return 'grid';
  return 'dagre';
}

export function fastGridLayout(nodes: LayoutInput[]): Positioned[] {
  if (nodes.length === 0) return [];

  const columns = Math.ceil(Math.sqrt(nodes.length));
  const maxWidth = Math.max(...nodes.map((node) => node.width));
  const maxHeight = Math.max(...nodes.map((node) => node.height));
  const cellWidth = maxWidth + GRID_CELL_GAP_X;
  const cellHeight = maxHeight + GRID_CELL_GAP_Y;

  return nodes.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return { ...node, position: { x: column * cellWidth, y: row * cellHeight } };
  });
}

export function layoutGraph(
  nodes: LayoutInput[],
  edges: LayoutEdge[],
  rankdir: 'TB' | 'LR' = 'TB',
): Positioned[] {
  return chooseLayoutStrategy(nodes, edges) === 'dagre'
    ? dagreLayout(nodes, edges, rankdir)
    : fastGridLayout(nodes);
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
