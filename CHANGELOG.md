# Changelog

## 2.0.0 - Unreleased

- Rewritten in TypeScript; the CLI now emits a self-contained interactive HTML
  file rendered with React Flow instead of a Graphviz PDF.
- Added progressive namespace, package, outer-type, and inner-class grouping.
- Added staged origin filtering, name exclusion, search results, directed edges,
  truthful hidden-edge counts, and click-to-highlight inspection.
- Added source-backed SYSTEM, APP, DEPENDENCY, UNKNOWN, and MIXED class origin
  labels using combined class-resolution and class-load traces.
- Added class-file bytecode footprint, collapsed-node totals, and measurement
  coverage without presenting unknown classes as zero bytes.
- Added direction and origin edge-color modes with reciprocal and unknown-edge
  encodings.
- Added direct edge selection, deterministic relayout, and full graph reset controls.
- Retained every distinct class-resolution edge instead of reducing the graph to
  a first-resolver tree.
- Removed the Python runtime and Graphviz `dot` dependencies.
- Added reproducible HelloWorld, SwingSet3, and Apache NetBeans reports.

## 0.36

- Initial Python and Graphviz release.
