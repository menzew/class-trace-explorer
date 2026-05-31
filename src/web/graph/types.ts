/** A unit shown on the canvas: either a collapsed package or a single class. */
export interface ViewNode {
  id: string;
  kind: 'package' | 'class';
  /** Package name (for package nodes) or the class's package (for class nodes). */
  package: string;
  /** Fully-qualified class name; undefined for package nodes. */
  fqcn?: string;
  /** Number of classes represented (package nodes only). */
  classCount?: number;
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
  abbreviate: boolean;
  search: string;
  expandedPackages: Set<string>;
  selectedNodeId: string | null;
}
