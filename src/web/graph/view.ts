import type { GraphModel } from '../../core/types';
import type { ViewGraph, ViewNode, ViewEdge, ViewState } from './types';
import { packageOf, packageNodeId } from './packages';

/** The display unit a class maps to: itself if its package is expanded, else its package node. */
function unitId(fqcn: string, expanded: Set<string>): string {
  const pkg = packageOf(fqcn);
  return expanded.has(pkg) ? fqcn : packageNodeId(pkg);
}

/**
 * Derive the visible graph from the class-level model and the current view state.
 *
 * - Edges whose `from` or `to` contains the filter string are dropped (matches
 *   the original tool's edge-level filter).
 * - Surviving edges have each endpoint mapped to its display unit (collapsed
 *   package node, or the class itself if its package is expanded).
 * - Edges that collapse to a self-loop (both endpoints in the same collapsed
 *   package) are hidden — they are "inside" the package node.
 * - Visible nodes are exactly the units referenced by the surviving edges.
 */
export function buildVisibleGraph(model: GraphModel, state: ViewState): ViewGraph {
  const { filter, expandedPackages } = state;

  const edgeMap = new Map<string, ViewEdge>();
  const nodeIds = new Set<string>();

  for (const edge of model.edges) {
    if (filter && (edge.from.includes(filter) || edge.to.includes(filter))) continue;

    const source = unitId(edge.from, expandedPackages);
    const target = unitId(edge.to, expandedPackages);
    if (source === target) {
      // Intra-package edge under a collapsed package: hidden, but the package node exists.
      nodeIds.add(source);
      continue;
    }
    nodeIds.add(source);
    nodeIds.add(target);
    const id = `${source}->${target}`;
    if (!edgeMap.has(id)) edgeMap.set(id, { id, source, target });
  }

  // Per-package class counts for collapsed package labels.
  const counts = new Map<string, number>();
  for (const fqcn of model.classes) {
    const pkg = packageOf(fqcn);
    counts.set(pkg, (counts.get(pkg) ?? 0) + 1);
  }

  const nodes: ViewNode[] = [...nodeIds].map((id) => {
    if (id.startsWith('pkg:')) {
      const pkg = id.slice('pkg:'.length);
      return { id, kind: 'package', package: pkg, classCount: counts.get(pkg) ?? 0 };
    }
    return { id, kind: 'class', package: packageOf(id), fqcn: id };
  });

  return { nodes, edges: [...edgeMap.values()] };
}
