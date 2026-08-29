# Architecture

ClassLoadGrapher has three layers: trace processing, command-line orchestration,
and the embedded React report.

## Core

`src/core` contains pure TypeScript modules:

- `parseTrace.ts` parses unified JVM logs and legacy resolution lines.
- `buildGraph.ts` deduplicates resolution pairs while retaining occurrence
  counts and class-load metadata.
- `classOrigin.ts` classifies classes from package and load-source evidence.
- `types.ts` defines the serialized graph contract shared by CLI and browser.

The core preserves exact class names and directed `from -> to` relationships.
Display normalization happens later and never changes graph identity.

## CLI

`src/cli` implements two workflows:

1. `graph` parses an existing trace and injects its graph model into the built
   HTML template.
2. `run` constructs a Java command with class logging enabled, captures a
   temporary trace, and delegates to the same report emitter.

The report emitter escapes serialized data before inserting it into the HTML.
The output has no runtime dependency on Node.js.

## Browser report

`src/web` loads the embedded model and derives a visible graph from immutable
source data and current view state. Filtering, expansion, type grouping, and
edge aggregation produce a new `ViewGraph`.

The visible hierarchy is:

```text
top-level namespace -> nested namespace -> package -> outer type -> JVM class
```

Inner, anonymous, and lambda classes are grouped under their outer type by
default. Users can inspect members without changing layout or explicitly render
members as graph nodes.

For dense graphs, layout and edge rendering are bounded. Exact topology remains
in the model and becomes available through selection and progressive expansion.

## Build outputs

- Vite and `vite-plugin-singlefile` produce `dist/web/index.html`.
- tsup produces the ESM CLI at `dist/cli/bin.js`.
- The npm package contains only `dist` and package metadata.
