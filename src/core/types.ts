/** A single class-resolution edge: `from` resolves `to` (fully-qualified names). */
export interface Edge {
  from: string;
  to: string;
}

/** Class-level graph model. Package grouping is derived in the web layer. */
export interface GraphModel {
  /** Unique fully-qualified class names that appear in any edge. */
  classes: string[];
  /** Deduplicated class-to-class resolution edges. */
  edges: Edge[];
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
