# Bytecode Footprint

ClassTrace Explorer can enrich class-load records with the uncompressed size of
the corresponding `.class` file. This metric is labeled **class-file bytes**: it
describes definition bytecode, not heap usage, metaspace, or generated JIT code.

## Measurement

During report generation, the CLI inspects accessible `file:` and `jar:file:`
load sources:

- Directory sources are resolved to `<package>/<ClassName>.class`.
- JAR sources are read from ZIP central-directory metadata without decompressing
  the archive.
- Missing artifacts do not prevent report generation.

The original trace remains authoritative for class identity and source. Size
enrichment never invents a zero for an unmeasured class.

## Aggregation

Namespace and outer-class nodes sum the known bytes of their represented
classes. The detail panel reports both the total and measurement coverage, such
as `304 / 312 classes`. Filtering recomputes the total from the classes that
remain in the graph; expanding or collapsing a node does not change the bytes
represented by that branch.

The thin bar at the bottom of each node compares its footprint with the largest
currently visible node. Bar width uses square-root scaling so one large package
does not make every smaller class indistinguishable. Node dimensions remain
stable to preserve graph layout and edge routing.

## Known Gaps

- `jrt:` module classes are not currently resolved from the local JDK image.
- Hidden classes, generated lambdas, and runtime proxies often have no class
  file to inspect.
- Imported traces can refer to JARs or directories that are not available on
  the machine generating the report.
- Multi-release JARs currently use the base class entry.
- Instrumentation can transform bytecode after it is read from disk.

A future Java agent can record the definition bytes actually presented to the
JVM. The model retains measurement provenance so that agent data can be added
without relabeling class-file measurements as runtime memory.
