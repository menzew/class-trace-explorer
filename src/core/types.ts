/** A class-resolution relationship and the first observed event for that pair. */
export interface Edge {
  from: string;
  to: string;
  /** JVM uptime from the unified-log decorator, when present. */
  timestampMs?: number;
  /** Source location reported by HotSpot for the resolving class. */
  sourceFile?: string;
  sourceLine?: number;
  /** Additional JVM annotation, for example `verification`. */
  detail?: string;
  /** Number of identical resolution events collapsed into this edge. */
  occurrences?: number;
}

export type ClassOrigin = 'system' | 'application' | 'dependency' | 'unknown';

/** A `class+load` event captured alongside resolution events. */
export interface ClassLoad {
  name: string;
  source?: string;
  timestampMs?: number;
}

export interface ClassInfo extends ClassLoad {
  origin: ClassOrigin;
  /** Uncompressed bytes in the class file resolved from the reported load source. */
  classFileBytes?: number;
  /** How the byte count was obtained; allows future agent measurements to coexist. */
  sizeProvenance?: 'class-file';
}

export interface OriginHints {
  appSources?: string[];
  appPrefixes?: string[];
}

/** Class-level graph model. Package grouping is derived in the web layer. */
export interface GraphModel {
  /** Unique fully-qualified class names that appear in any edge. */
  classes: string[];
  /** Deduplicated class-to-class resolution edges. */
  edges: Edge[];
  /** Load origin and source details keyed by fully-qualified class name. */
  classInfo?: Record<string, ClassInfo>;
}

/** Initial UI state seeded by the CLI flags. */
export interface EmbeddedOpts {
  abbreviate: boolean;
  filter: string | null;
}

/** Everything the CLI injects into the HTML template. */
export interface EmbeddedData {
  graph: GraphModel;
  opts: EmbeddedOpts;
}
