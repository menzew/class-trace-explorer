# ClassLoadGrapher — Cold-Start Investigation Workbench

**Date:** 2026-06-01
**Status:** Approved design direction, pending user review of written spec

## Summary

ClassLoadGrapher should move from "interactive class-resolution graph" to a
diagnostic workbench for JVM cold-start investigations and regressions. The
default experience must load quickly with the minimum useful view, then let the
user drill into weighted package/class neighborhoods, filter by layer/package,
and compare a current trace against a baseline.

The graph is no longer the whole product. V1 combines a ranked investigation
dashboard, faceted query controls, regression deltas, and multiple
visualizations. Large graph rendering should use Sigma.js/Graphology rather than
React Flow as the primary viewport. React Flow can remain temporarily for small
or transitional views, but it is not the target renderer for large traces.

## Goals

- Open large traces quickly by defaulting to a compact weighted overview.
- Support real cold-start debugging questions:
  - What loaded the most?
  - What appeared early?
  - What changed since a known-good baseline?
  - Which app/library package pulled in JDK or framework internals?
  - Which package boundaries are the heaviest?
- Add regression mode in V1: baseline trace vs current trace.
- Preserve trace event order, not just deduplicated class edges.
- Classify JDK/platform classes automatically and support app package roots.
- Provide useful filters without requiring users to understand the raw graph.
- Keep the output as a self-contained offline HTML artifact.

## Non-goals

- No hosted service, database, accounts, sharing, or telemetry.
- No freeform query language in V1. Query state is structured JSON, exposed
  through presets and facets.
- No attempt to render every class and every edge by default.
- No Processing.js dependency. Processing.js is legacy; p5-style custom canvas
  views are only considered for special-purpose diagnostics.

## Product Shape

V1 has two modes.

### Single Trace Mode

Used with one trace. It answers:

- What loaded?
- What is JDK vs non-JDK?
- Which packages/classes dominate resolution count?
- Which package boundaries are noisy?
- What pulled in a suspicious package/class?

### Regression Mode

Used with baseline and current traces. It answers:

- What classes/packages are new?
- What disappeared?
- Which edges got heavier?
- Which new app/library package pulled in JDK or framework internals?
- What changed enough to explain slower cold start?

The default screen is an investigation dashboard, not a full graph. The graph
viewport supports inspection after the user has chosen a query or result row.

## CLI Contract

Existing commands remain:

```bash
clgrapher graph current.trace out
clgrapher run out --jar app.jar
```

New comparison command:

```bash
clgrapher compare baseline.trace current.trace out
```

Common classification options:

```bash
--app-package com.example
--app-package io.github.homebeaver
```

`--app-package` may be repeated. If omitted, the CLI still classifies JDK
packages automatically and treats other packages as library/unknown until the UI
temporarily reclassifies them.

## Classification

Default layer classification:

| Layer | Rule |
|---|---|
| `jdk` | `java.*`, `javax.*`, `jdk.*`, `sun.*`, `com.sun.*` |
| `app` | Matches a provided `--app-package` prefix |
| `library` | Non-JDK and not app, when the package has a normal package prefix |
| `unknown` | Empty/default package or otherwise unclassified |

The UI can reclassify package roots for exploration, but those changes are
session-local inside the generated HTML.

## Data Model

The CLI should emit both ordered events and derived metrics. Today the tool
deduplicates edges early; V1 must preserve event order first and derive graphs
from it.

```ts
type Layer = 'app' | 'library' | 'jdk' | 'unknown';

interface TraceModel {
  events: ResolveEvent[];
  classes: ClassMetric[];
  packages: PackageMetric[];
  classEdges: EdgeMetric[];
  packageEdges: EdgeMetric[];
  summary: TraceSummary;
}

interface ResolveEvent {
  index: number;
  from: string;
  to: string;
  fromPackage: string;
  toPackage: string;
  fromLayer: Layer;
  toLayer: Layer;
}

interface ClassMetric {
  name: string;
  packageName: string;
  layer: Layer;
  inbound: number;
  outbound: number;
  firstSeen: number;
}

interface PackageMetric {
  name: string;
  layer: Layer;
  classCount: number;
  inbound: number;
  outbound: number;
  internal: number;
  firstSeen: number;
}

interface EdgeMetric {
  source: string;
  target: string;
  sourceLayer: Layer;
  targetLayer: Layer;
  scope: 'class' | 'package';
  weight: number;
  firstSeen: number;
}
```

Regression mode embeds:

```ts
interface RegressionModel {
  baseline: TraceModel;
  current: TraceModel;
  delta: RegressionDelta;
}

interface DeltaMetric {
  id: string;
  status: 'added' | 'removed' | 'unchanged' | 'changed';
  beforeWeight: number;
  currentWeight: number;
  weightDelta: number;
  beforeFirstSeen: number | null;
  currentFirstSeen: number | null;
  firstSeenDelta: number | null;
}
```

Derived metrics needed for V1:

- Weight: raw resolution event count represented by an item.
- Fanout: outbound count.
- Pull-in: incoming package/class responsible for introducing a target.
- First seen: earliest event index for a class/package/edge.
- Boundary weight: app -> library, app -> JDK, library -> JDK, etc.
- Delta: added, removed, unchanged, changed; plus weight and first-seen deltas.

## Query Model

V1 exposes structured queries through presets and facets. Internally, a query is
serializable JSON so saved presets and future query text can share the same
execution engine.

Facets:

- Layer: app, library, jdk, unknown.
- Package prefix include/exclude.
- Boundary direction: app -> JDK, library -> JDK, app -> library, etc.
- Regression status: added, removed, changed, unchanged.
- Minimum weight.
- First-seen range.
- Node type: package or class.
- Edge scope: package boundary, package internal, class boundary.

Built-in presets:

- Minimal
- Non-JDK Only
- Added In Current
- Heavier Than Baseline
- App -> JDK
- Top Fanout
- Early Loads
- Boundary Hotspots
- Why This Package?

Defaults:

- Single trace: Minimal.
- Regression: Added In Current plus top boundary weight deltas.

## UI Layout

### Investigation Header

Always visible and compact:

- Mode: Single Trace or Regression.
- Counts: classes, packages, resolves, JDK/non-JDK/app/library split.
- Active query name.
- Result count.
- Reset and Save Query actions.

### Query / Facet Panel

The main control surface:

- Layer toggles.
- Package include/exclude controls.
- Boundary selectors.
- Regression status filters.
- Weight threshold control.
- First-seen range control.
- Preset list.

### Results + Visualizations

The ranked table is the workhorse. It should show packages/classes/edges with:

- Name.
- Layer.
- Weight.
- Inbound/outbound.
- First seen.
- Delta status and delta values in regression mode.
- Dominant incoming package/class.

Selecting a row focuses the visualization on its neighborhood.

The graph viewport is query-bound and top-N-limited by default. Clicking a
package/class shows details:

- inbound/outbound resolves
- first seen index
- layer
- top callers/callees
- package boundary weights
- delta info in regression mode

## Visualization Strategy

Use a hybrid visualization system.

### Primary Graph: Sigma.js + Graphology

Sigma.js becomes the primary graph viewport for large traces:

- WebGL rendering for large weighted graphs.
- Graphology as the graph data model and algorithm layer.
- Supports pan/zoom, hover, selection, neighborhoods, and weighted styling.
- Better fit than React Flow for thousands of nodes/edges.

### Diagnostic Views

Add custom canvas/SVG views for non-node-link questions:

- Boundary matrix: package-to-package weights and deltas.
- Timeline strip: first-seen order and cold-start phases.
- Heatmap: package weight vs first-seen.
- Delta view: added/removed/heavier packages/classes.

p5.js-style canvas rendering may be useful for these custom views, but V1
should not depend on p5 unless a view clearly benefits from it. Plain Canvas or
SVG is acceptable when simpler.

### React Flow

React Flow is not the target renderer for large traces. It may remain during
migration for small graphs or transitional UI, but the V1 workbench should not
depend on React Flow for its primary large-graph experience.

## Default Loading Behavior

The generated HTML must load the minimum useful view:

- Do not render full class graph.
- Do not render all edges.
- Start with weighted package-level query results.
- Hide JDK internals unless selected by query.
- Show top-N nodes/edges only in the graph viewport.
- Keep detailed expansion demand-driven.

Package expansion is one level at a time. Expanding a package should reveal
classes and immediate boundary context, not recursively expand everything.

## Data Flow

Single trace:

```text
trace -> parse ordered events -> classify -> derive metrics -> embed TraceModel
```

Regression:

```text
baseline trace -> TraceModel
current trace  -> TraceModel
both models    -> RegressionDelta -> embed RegressionModel
```

Browser:

```text
embedded model -> query engine -> ranked results -> graphology subgraph
                                      -> table + Sigma viewport + diagnostics
```

## Error Handling

- No resolve events: valid HTML with empty-state guidance.
- Compare command with unreadable baseline/current: clear CLI error.
- Compare command with one empty trace: render available data and make the
  missing/empty side explicit.
- Unknown app packages: no fatal error; classify as library/unknown.
- Oversized query result: show top-N with count of hidden matches and a refine
  prompt.

## Testing

Core tests:

- Preserve ordered raw events.
- Classify JDK/app/library/unknown layers.
- Derive class, package, class-edge, and package-edge weights.
- Compute first-seen indices.
- Compute regression added/removed/changed/unchanged metrics.
- Query presets produce expected filtered result sets.

CLI tests:

- `graph` still emits a single-trace HTML.
- `compare baseline current out` emits regression data.
- repeated `--app-package` affects classification.
- generated HTML does not corrupt bundled JavaScript when class names contain
  placeholder-like strings.

Web tests:

- default query is Minimal for single trace.
- default query is regression-focused for compare output.
- table ranks by weight/delta as expected.
- graph viewport receives a top-N subgraph, not the full trace.
- selecting a result builds the correct neighborhood.

Browser smoke:

- Load a large generated trace without freezing.
- In regression mode, select Added In Current and inspect one added package.

## Migration Plan Shape

Implementation should be staged:

1. Add ordered event and metric derivation in `core`.
2. Add `compare` CLI and regression model emission.
3. Add query engine and preset tests.
4. Replace/augment the web UI with dashboard, facets, and ranked table.
5. Add Sigma.js/Graphology graph viewport.
6. Add boundary matrix and timeline diagnostics.
7. Retire React Flow from large-graph path.

Each stage should keep `npm test`, `npm run typecheck`, and `npm run build`
green.

## Open Risks

- Sigma.js adds a new rendering stack and requires design care around styling,
  hit testing, and labels.
- Regression output can become large if the full event stream is embedded
  naively. The implementation should prefer compact metric structures while
  preserving enough event order for first-seen and drill-down queries.
- App-vs-library classification cannot be perfect automatically. V1 mitigates
  this with CLI `--app-package` and UI session reclassification.
- Query/preset UX can become too complex. V1 should keep presets prominent and
  facets composable, but avoid exposing a textual query language.
