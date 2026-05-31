# ClassLoadGrapher — Graphviz→React Flow & Python→TypeScript Migration

**Date:** 2026-05-31
**Status:** Approved design (pre-implementation)

## Summary

ClassLoadGrapher is a CLI that parses a JVM class-resolution trace and renders a
graph of which classes resolve which other classes. Today it is written in
Python and renders a **static PDF** via the Graphviz `dot` binary.

This migration rewrites the tool in **TypeScript** and replaces Graphviz with
**React Flow**. The deliverable changes from a static PDF to a **single
self-contained interactive HTML file** that the CLI emits. The CLI workflow
(including launching a Java program to capture its trace) is preserved.

## Goals

- Full rewrite Python → TypeScript (strict). No Python left in the repo.
- Replace Graphviz with React Flow rendered in a self-contained HTML artifact.
- Preserve the existing CLI workflow and feature set (`graph` + `run`
  subcommands, abbreviation, filtering, back-compat positional args).
- Add a **rich interactive UI** in the generated HTML: live filter, live
  abbreviation toggle, search, expand/collapse packages, click-to-highlight.
- Scale to real JVM startup traces (thousands of classes) via
  **package aggregation by default**.

## Non-goals

- No web server / hosted app — the artifact is a static `.html` file opened
  locally (Approach 1 below).
- No persistence, accounts, or sharing features.
- No change to how Java emits traces (`-Xlog:class+resolve` / legacy `RESOLVE`).

## Decisions (resolved during brainstorming)

| Decision | Choice |
|---|---|
| Form factor | Node/TS **CLI → self-contained HTML** file |
| Interactivity | **Rich interactive UI** (filter, abbreviate, search, expand/collapse, highlight); CLI flags seed initial state |
| Scale strategy | **Package-aggregated by default**; expand a package to drill into its classes |
| HTML production | **Approach 1**: pre-built web template + runtime data injection |
| Graph semantics | **Full graph** — keep every distinct `from→to` edge (dedup exact duplicates, skip array types). Differs from the old tool's lossy "tree". |
| Docs | Convert `README.rst` → `README.md`; **drop Sphinx** (`docs/src`) |
| Lint/format | **ESLint + Prettier** |

## Architecture (Approach 1)

The web app (React + React Flow + dagre) is compiled **once at package build
time** by Vite + `vite-plugin-singlefile` into a single `template.html` with all
JS/CSS inlined, shipped inside the npm package. At **runtime** the CLI parses the
trace into a graph model, injects it into a placeholder
(`window.__CLG_GRAPH__`), and writes `<dest>.html`. The runtime needs no bundler
and the output needs no network.

Rejected alternatives: runtime bundling with esbuild (ships a bundler as a
runtime dep, slow, fragile); CDN-referenced React Flow (not self-contained).

### Layers

Three layers map to three concerns; `core` imports neither Node nor React.

```
src/
  core/                 # isomorphic pure TS — fully unit-tested headless
    types.ts            # Edge, GraphModel
    parseTrace.ts       # parseResolveLine() + parseTrace(text): Edge[]
    buildGraph.ts       # Edge[] -> GraphModel (dedup, skip array types)
    abbreviate.ts       # java.lang.String -> j.l.String
  cli/                  # Node only
    bin.ts              # #!/usr/bin/env node entry
    index.ts            # commander: `graph` + `run`, back-compat shim, flags
    runJava.ts          # spawn java -Xlog:class+resolve, capture trace
    emitHtml.ts         # read template.html, inject model JSON, write <dest>.html, --view opener
  web/                  # Browser only (React + React Flow + dagre)
    index.html          # contains the __CLG_GRAPH__ placeholder
    main.tsx, App.tsx
    graph/{useLayout.ts, toReactFlow.ts, nodes/}
    controls/{Filter, Search, AbbrevToggle, ExpandControls, Legend}
tests/                  # vitest
dist/                   # build output: web template.html + compiled cli
```

## Components

### core/types.ts
- `interface Edge { from: string; to: string }` — fully-qualified class names.
- `interface GraphModel { classes: string[]; edges: Edge[] }` — class-level
  model. Package aggregation is a **view concern** derived in the web layer, not
  stored in the model.

### core/parseTrace.ts
- `parseResolveLine(line: string): Edge | null` — direct port of the Python
  function:
  - Unified logging: lines starting with `[`; require `class,resolve` within the
    leading tag block (up to the last `]`); the message after the tags is
    `<from> <to> <source>` → take the first two whitespace-separated tokens.
  - Legacy: lines starting with `RESOLVE`; strip the keyword, take first two tokens.
  - Blank lines and non-resolve lines (e.g. `class,load`) → `null`.
  - Fewer than 2 tokens → `null`.
- `parseTrace(text: string): Edge[]` — split into lines, map through
  `parseResolveLine`, drop nulls. No dedup here (that is `buildGraph`'s job).

### core/buildGraph.ts
- `buildGraph(edges: Edge[]): GraphModel`:
  - Skip edges whose **target** is an array type (`to` contains `[`).
  - Dedup **exact** `from→to` pairs (Set keyed by `from + " " + to`).
  - **Keep all distinct edges** (full graph, not the old one-incoming-edge tree).
  - Collect the unique set of class names appearing as a source or target.

### core/abbreviate.ts
- `abbreviatePackage(fqcn: string): string` — port of the Python logic: for each
  dotted segment of the package, emit its first character + `.`, then append the
  simple class name. `java.lang.String` → `j.l.String`. Applied per-node in the
  web layer when the abbreviate toggle is on.

### cli/index.ts (commander)
- `graph <trace_file> <dest>` → parse file → build model → emit `<dest>.html`.
- `run <dest> [options] [-- <java args>]`:
  - `--jar <jar>` → prepend `-jar <jar>`; `--cp/--classpath <cp>` → prepend
    `-cp <cp>`; bare args after `--` passed verbatim to `java`.
  - `--java <path>` (default `java`); `--keep-trace <file>` (keep trace, else
    temp file removed afterward).
  - Error if nothing to run.
- Common flags on both: `-abrv` (seed abbreviate=on), `-f <filter>` (seed filter),
  `--view` (open result), `-v/--verbose`, `-vv/--very-verbose`.
- Back-compat shim: if `argv[0]` is not a known subcommand/flag, prepend `graph`.
- `--version`.

### cli/runJava.ts
- Port of Python `run_java`: build `-Xlog:class+resolve=debug:file=<trace>`,
  `spawnSync(java, [xlog, ...javaArgs], { stdio: 'inherit' })`.
- Temp trace via `os.tmpdir()` + a unique name; **remove the placeholder file
  before launch** so unified logging writes a single fresh file (matches the
  Python `os.remove` quirk handling).
- Un-launchable `java` (ENOENT) → fatal error with a clear message.
- Nonzero exit → warn and still graph the trace captured so far.

### cli/emitHtml.ts
- Resolve `template.html` relative to the compiled CLI location (packaged asset).
- Replace the placeholder with
  `window.__CLG_GRAPH__ = <JSON.stringify(model)>; window.__CLG_OPTS__ = {abbreviate, filter}`.
- Write `<dest>.html` (note: `.html` extension appended like the old `.pdf`).
- `--view` → open via the platform opener (`open`/`xdg-open`/`start`, or the
  `open` npm package).

### web layer
- **State:** raw `GraphModel` from `window.__CLG_GRAPH__`; view state
  `{ filter, abbreviate, expandedPackages: Set<string>, selectedNode, search }`
  seeded from `window.__CLG_OPTS__`.
- **Default view:** one node per **package**; a package→package edge exists if
  any class in the source package resolves any class in the target package.
- **Expand/collapse:** expanding a package swaps its single package node for its
  member class nodes and reroutes edges; collapsing reverses it.
- **Layout:** `dagre` directed layout (`rankdir: TB`), recomputed whenever the
  visible node/edge set changes; React Flow consumes computed x/y.
- **Controls (left panel):** live filter, abbreviate toggle, search-to-locate,
  expand-all / collapse-all, visible-node count.
- **Interactions:** pan/zoom/drag, MiniMap, fit-view; click a node to highlight
  its incoming/outgoing edges and dim the rest.
- **Legend:** ports "A → B : class A resolves class B" as an overlay panel.

## Data flow

```
java -Xlog:class+resolve  ─┐
existing trace file       ─┴─> parseTrace ─> buildGraph ─> emitHtml(inject) ─> <dest>.html
                                                                                    └─> browser:
                                                       model -> view state -> dagre layout -> React Flow render
```

## Error handling

- File not found / IO error on the trace → clear message, nonzero exit.
- `java` not launchable → fatal error naming the launcher.
- Java nonzero exit → warning; graph the captured-so-far trace.
- Trace with no resolve lines → emit a valid HTML with an empty-state message
  ("No class resolutions found — check the trace / `-Xlog` flag").
- Web: missing/empty `window.__CLG_GRAPH__` → friendly empty state.

## Testing & tooling

- **vitest** for `core`:
  - Port the 3 `test_parse.py` cases (unified logging, legacy RESOLVE, ignore
    non-resolve/blank).
  - `buildGraph`: dedup exact duplicates, skip array targets, keep distinct
    multi-incoming edges (the full-graph behavior).
  - `abbreviate`: `java.lang.String` → `j.l.String`.
  - Web pure transforms: package aggregation, filtering, `toReactFlow`.
- **CLI** integration test: run `graph` on a fixture trace, assert the injected
  JSON appears in the output HTML (no JDK required).
- TypeScript **strict**; ESLint + Prettier; Node 18+; npm.
- **CI:** replace the Python GitHub Actions workflows with a Node workflow
  (install → typecheck → lint → test → build).

## Migration removals

Delete: `classloadgrapher/` package; `setup.py`, `setup.cfg`, `pyproject.toml`
(Python), `requirements.txt`, `test-requirements.txt`, `conftest.py`,
`.coveragerc`; `tests/*.py`; `ClassloadGrapher.egg-info/`; `build/`;
`.travis.yml`; Python `.github/workflows/*.yml`; `docs/src` (Sphinx).
Drop the Graphviz `dot` runtime dependency entirely. A JDK remains required only
for the `run` subcommand (unchanged).

## Build & distribution

- `npm run build:web` → Vite singlefile → `dist/web/template.html`.
- `npm run build:cli` → `tsc` → `dist/cli/*.js`.
- `package.json` `bin: { clgrapher: "dist/cli/bin.js" }`; `files` includes the
  template asset; published as an npm package.

## Open risks

- Expanding a single very large package can add many nodes at once; dagre may be
  slow. Mitigation deferred: rely on package aggregation for the default view;
  if needed later, add a per-expansion node cap with a warning. Not in scope now.
- React Flow / dagre version pinning to a known-good pair will be fixed during
  the implementation plan.
