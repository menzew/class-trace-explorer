import type { GraphModel } from '../../core/types';
import { classifyOrigin } from '../../core/classOrigin';
import type { NodeRole, SourceLocation, ViewGraph, ViewNode, ViewEdge, ViewState } from './types';
import { outerClassOf, packageOf, typeNodeId, visibleUnitId } from './packages';

interface NodeAccumulator {
  incomingCount: number;
  outgoingCount: number;
  internalEdgeCount: number;
  crossPackageEdgeCount: number;
  hiddenEdgeCount: number;
  firstSeenMs?: number;
  sourceLocations: Map<string, SourceLocation>;
  annotations: Set<string>;
  origins: Set<ViewNode['origin']>;
  loadSources: Set<string>;
  loadedAtMs?: number;
  classFileBytes: number;
  measuredClassCount: number;
}

function newAccumulator(): NodeAccumulator {
  return {
    incomingCount: 0,
    outgoingCount: 0,
    internalEdgeCount: 0,
    crossPackageEdgeCount: 0,
    hiddenEdgeCount: 0,
    sourceLocations: new Map(),
    annotations: new Set(),
    origins: new Set(),
    loadSources: new Set(),
    classFileBytes: 0,
    measuredClassCount: 0,
  };
}

function rolesFor(stats: NodeAccumulator): NodeRole[] {
  const roles: NodeRole[] = [];
  if (stats.incomingCount === 0 && stats.outgoingCount > 0) roles.push('entry');
  if (stats.outgoingCount === 0 && stats.incomingCount > 0) roles.push('leaf');
  if (stats.incomingCount + stats.outgoingCount >= 10) roles.push('hub');
  if (stats.crossPackageEdgeCount > 0) roles.push('bridge');
  return roles;
}

function originFor(stats: NodeAccumulator): ViewNode['origin'] {
  if (stats.origins.size === 0) return 'unknown';
  if (stats.origins.size > 1) return 'mixed';
  return [...stats.origins][0];
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
  const normalizedFilter = filter?.trim().toLocaleLowerCase() ?? '';
  const includedClasses = new Set(
    model.classes.filter((fqcn) => {
      if (normalizedFilter && fqcn.toLocaleLowerCase().includes(normalizedFilter)) return false;
      const origin = model.classInfo?.[fqcn]?.origin ?? classifyOrigin({ name: fqcn });
      return state.visibleOrigins.has(origin);
    }),
  );
  const typeCounts = new Map<string, number>();
  const typeMembers = new Map<string, string[]>();
  for (const fqcn of includedClasses) {
    const outer = outerClassOf(fqcn);
    typeCounts.set(outer, (typeCounts.get(outer) ?? 0) + 1);
    const members = typeMembers.get(outer) ?? [];
    members.push(fqcn);
    typeMembers.set(outer, members);
  }
  const unitId = (fqcn: string): string => {
    // Namespace and outer-type aggregation are separate levels so inner-class
    // families can be inspected without changing package topology.
    const namespaceUnit = visibleUnitId(fqcn, expandedPackages);
    if (namespaceUnit !== fqcn) return namespaceUnit;
    const outer = outerClassOf(fqcn);
    if ((typeCounts.get(outer) ?? 0) > 1 && !state.expandedTypes.has(outer)) {
      return typeNodeId(outer);
    }
    return fqcn;
  };

  const edgeMap = new Map<string, ViewEdge>();
  const nodeIds = new Set<string>();
  const stats = new Map<string, NodeAccumulator>();

  const statsFor = (id: string): NodeAccumulator => {
    let value = stats.get(id);
    if (!value) {
      value = newAccumulator();
      stats.set(id, value);
    }
    return value;
  };

  // Seed every surviving class so filtering also behaves consistently for isolated nodes.
  for (const fqcn of includedClasses) {
    const id = unitId(fqcn);
    const nodeStats = statsFor(id);
    const info = model.classInfo?.[fqcn];
    nodeIds.add(id);
    nodeStats.origins.add(info?.origin ?? classifyOrigin({ name: fqcn }));
    if (info?.source) nodeStats.loadSources.add(info.source);
    if (info?.classFileBytes !== undefined) {
      nodeStats.classFileBytes += info.classFileBytes;
      nodeStats.measuredClassCount += 1;
    }
    if (info?.timestampMs !== undefined) {
      nodeStats.loadedAtMs = Math.min(nodeStats.loadedAtMs ?? Infinity, info.timestampMs);
    }
  }

  for (const edge of model.edges) {
    const sourceIncluded = includedClasses.has(edge.from);
    const targetIncluded = includedClasses.has(edge.to);
    if (!sourceIncluded || !targetIncluded) {
      const occurrences = edge.occurrences ?? 1;
      const crossesPackage = packageOf(edge.from) !== packageOf(edge.to);
      if (sourceIncluded) {
        const source = unitId(edge.from);
        const sourceStats = statsFor(source);
        sourceStats.outgoingCount += occurrences;
        sourceStats.hiddenEdgeCount += occurrences;
        if (crossesPackage) sourceStats.crossPackageEdgeCount += occurrences;
        if (edge.timestampMs !== undefined) {
          sourceStats.firstSeenMs = Math.min(sourceStats.firstSeenMs ?? Infinity, edge.timestampMs);
        }
        if (edge.sourceFile && edge.sourceLine !== undefined) {
          const location = { file: edge.sourceFile, line: edge.sourceLine };
          sourceStats.sourceLocations.set(`${location.file}:${location.line}`, location);
        }
        if (edge.detail) sourceStats.annotations.add(edge.detail);
        nodeIds.add(source);
      }
      if (targetIncluded) {
        const target = unitId(edge.to);
        const targetStats = statsFor(target);
        targetStats.incomingCount += occurrences;
        targetStats.hiddenEdgeCount += occurrences;
        if (crossesPackage) targetStats.crossPackageEdgeCount += occurrences;
        if (edge.timestampMs !== undefined) {
          targetStats.firstSeenMs = Math.min(targetStats.firstSeenMs ?? Infinity, edge.timestampMs);
        }
        nodeIds.add(target);
      }
      continue;
    }

    const source = unitId(edge.from);
    const target = unitId(edge.to);
    const sourceStats = statsFor(source);
    const targetStats = statsFor(target);
    const occurrences = edge.occurrences ?? 1;
    const sourceInfo = model.classInfo?.[edge.from];
    const targetInfo = model.classInfo?.[edge.to];

    sourceStats.origins.add(sourceInfo?.origin ?? classifyOrigin({ name: edge.from }));
    targetStats.origins.add(targetInfo?.origin ?? classifyOrigin({ name: edge.to }));
    if (sourceInfo?.source) sourceStats.loadSources.add(sourceInfo.source);
    if (targetInfo?.source) targetStats.loadSources.add(targetInfo.source);
    if (sourceInfo?.timestampMs !== undefined) {
      sourceStats.loadedAtMs = Math.min(sourceStats.loadedAtMs ?? Infinity, sourceInfo.timestampMs);
    }
    if (targetInfo?.timestampMs !== undefined) {
      targetStats.loadedAtMs = Math.min(targetStats.loadedAtMs ?? Infinity, targetInfo.timestampMs);
    }

    if (edge.timestampMs !== undefined) {
      sourceStats.firstSeenMs = Math.min(sourceStats.firstSeenMs ?? Infinity, edge.timestampMs);
      targetStats.firstSeenMs = Math.min(targetStats.firstSeenMs ?? Infinity, edge.timestampMs);
    }
    if (edge.sourceFile && edge.sourceLine !== undefined) {
      const location = { file: edge.sourceFile, line: edge.sourceLine };
      sourceStats.sourceLocations.set(`${location.file}:${location.line}`, location);
    }
    if (edge.detail) sourceStats.annotations.add(edge.detail);

    if (source === target) {
      // Intra-package edge under a collapsed package: hidden, but the package node exists.
      sourceStats.internalEdgeCount += occurrences;
      nodeIds.add(source);
      continue;
    }

    sourceStats.outgoingCount += occurrences;
    targetStats.incomingCount += occurrences;
    if (packageOf(edge.from) !== packageOf(edge.to)) {
      sourceStats.crossPackageEdgeCount += occurrences;
      targetStats.crossPackageEdgeCount += occurrences;
    }
    nodeIds.add(source);
    nodeIds.add(target);
    const id = `${source}->${target}`;
    if (!edgeMap.has(id)) edgeMap.set(id, { id, source, target });
  }

  // Counts belong to the currently visible namespace, not necessarily the full package.
  const counts = new Map<string, number>();
  for (const fqcn of includedClasses) {
    const id = unitId(fqcn);
    if (id.startsWith('pkg:')) {
      const namespace = id.slice('pkg:'.length);
      counts.set(namespace, (counts.get(namespace) ?? 0) + 1);
    } else if (id.startsWith('type:')) {
      const outer = id.slice('type:'.length);
      counts.set(outer, (counts.get(outer) ?? 0) + 1);
    }
  }

  const nodes: ViewNode[] = [...nodeIds].map((id) => {
    const nodeStats = statsFor(id);
    const common = {
      origin: originFor(nodeStats),
      incomingCount: nodeStats.incomingCount,
      outgoingCount: nodeStats.outgoingCount,
      internalEdgeCount: nodeStats.internalEdgeCount,
      crossPackageEdgeCount: nodeStats.crossPackageEdgeCount,
      hiddenEdgeCount: nodeStats.hiddenEdgeCount,
      firstSeenMs: nodeStats.firstSeenMs,
      roles: rolesFor(nodeStats),
      sourceLocations: [...nodeStats.sourceLocations.values()].slice(0, 8),
      annotations: [...nodeStats.annotations].slice(0, 8),
      loadSources: [...nodeStats.loadSources].slice(0, 8),
      loadedAtMs: nodeStats.loadedAtMs,
      classFileBytes: nodeStats.measuredClassCount > 0 ? nodeStats.classFileBytes : undefined,
      measuredClassCount: nodeStats.measuredClassCount,
    };
    if (id.startsWith('pkg:')) {
      const pkg = id.slice('pkg:'.length);
      return { id, kind: 'package', package: pkg, classCount: counts.get(pkg) ?? 0, ...common };
    }
    if (id.startsWith('type:')) {
      const outer = id.slice('type:'.length);
      return {
        id,
        kind: 'type',
        package: packageOf(outer),
        fqcn: outer,
        classCount: counts.get(outer) ?? 0,
        members: typeMembers.get(outer)?.sort(),
        ...common,
      };
    }
    const outer = outerClassOf(id);
    return {
      id,
      kind: 'class',
      package: packageOf(id),
      fqcn: id,
      groupedOuter: (typeCounts.get(outer) ?? 0) > 1 ? outer : undefined,
      ...common,
    };
  });

  return { nodes, edges: [...edgeMap.values()] };
}
