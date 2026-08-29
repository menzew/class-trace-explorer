import type { ClassOrigin } from '../../core/types';

export type NodeOrigin = ClassOrigin | 'mixed';
export type NodeRole = 'entry' | 'leaf' | 'hub' | 'bridge';

export interface SourceLocation {
  file: string;
  line: number;
}

/** A unit shown on the canvas: namespace, collapsed outer type, or exact class. */
export interface ViewNode {
  id: string;
  kind: 'package' | 'type' | 'class';
  /** Package name (for package nodes) or the class's package (for class nodes). */
  package: string;
  /** Fully-qualified class name; undefined for package nodes. */
  fqcn?: string;
  /** Outer type used to regroup an expanded inner-class family. */
  groupedOuter?: string;
  /** Exact JVM classes represented by a collapsed outer-type node. */
  members?: string[];
  /** Number of classes represented (package nodes only). */
  classCount?: number;
  /** Sum of known uncompressed class-file bytes represented by this node. */
  classFileBytes?: number;
  /** Classes contributing to classFileBytes; compare with classCount for coverage. */
  measuredClassCount?: number;
  origin: NodeOrigin;
  incomingCount: number;
  outgoingCount: number;
  internalEdgeCount: number;
  crossPackageEdgeCount: number;
  /** Incident relationships not rendered because the opposite class is filtered out. */
  hiddenEdgeCount?: number;
  firstSeenMs?: number;
  roles: NodeRole[];
  sourceLocations: SourceLocation[];
  annotations: string[];
  loadSources: string[];
  loadedAtMs?: number;
}

export interface ViewEdge {
  id: string;
  source: string;
  target: string;
}

export interface ViewGraph {
  nodes: ViewNode[];
  edges: ViewEdge[];
}

export interface ViewState {
  filter: string | null;
  visibleOrigins: Set<ClassOrigin>;
  abbreviate: boolean;
  search: string;
  expandedPackages: Set<string>;
  expandedTypes: Set<string>;
  selectedNodeId: string | null;
}
