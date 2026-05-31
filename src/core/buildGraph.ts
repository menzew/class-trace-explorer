import type { Edge, GraphModel } from './types';

/**
 * Build the deduplicated class-level graph from raw resolution edges.
 *
 * - Skips edges whose target is an array type (name contains `[`), matching the
 *   original tool.
 * - Deduplicates exact `from->to` pairs.
 * - Keeps every distinct edge (the full graph). The original Python tool kept
 *   only the first edge resolving each target, collapsing the graph into a tree;
 *   the interactive UI handles density, so we preserve all edges.
 */
export function buildGraph(edges: Edge[]): GraphModel {
  const seen = new Set<string>();
  const classes = new Set<string>();
  const out: Edge[] = [];

  for (const { from, to } of edges) {
    if (to.includes('[')) continue;
    const key = `${from} ${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from, to });
    classes.add(from);
    classes.add(to);
  }

  return { classes: [...classes], edges: out };
}
