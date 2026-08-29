import type { ClassLoad, Edge, GraphModel, OriginHints } from './types';
import { buildClassInfo } from './classOrigin';

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
export function buildGraph(
  edges: Edge[],
  loads: ClassLoad[] = [],
  originHints: OriginHints = {},
): GraphModel {
  const seen = new Map<string, number>();
  const classes = new Set<string>();
  const out: Edge[] = [];

  for (const edge of edges) {
    const { from, to } = edge;
    if (to.includes('[')) continue;
    const key = `${from} ${to}`;
    const existingIndex = seen.get(key);
    if (existingIndex !== undefined) {
      const existing = out[existingIndex];
      existing.occurrences = (existing.occurrences ?? 1) + 1;
      continue;
    }
    seen.set(key, out.length);
    out.push({ ...edge });
    classes.add(from);
    classes.add(to);
  }

  const classNames = [...classes];
  return {
    classes: classNames,
    edges: out,
    classInfo: buildClassInfo(classNames, loads, originHints),
  };
}
