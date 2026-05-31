# ClassLoadGrapher TS + React Flow Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite ClassLoadGrapher in TypeScript and replace the Graphviz PDF output with a single self-contained interactive HTML file built on React Flow.

**Architecture:** Three layers — a pure-TS `core` (trace parsing + graph model, no Node/React), a Node `cli` (commander; runs Java, captures the trace, injects the model into a pre-built HTML template), and a React `web` app (React Flow + dagre) compiled once by Vite + `vite-plugin-singlefile` into the template the CLI ships. The CLI parses a trace into a `GraphModel`, injects it as JSON into the template, and writes `<dest>.html`. The browser reads the embedded JSON, derives a package-aggregated view, lays it out with dagre, and renders it interactively.

**Tech Stack:** TypeScript 5 (strict), Node ≥18 (ESM), Vite 5 + `@vitejs/plugin-react` + `vite-plugin-singlefile`, React 18, `@xyflow/react` v12, `@dagrejs/dagre` v1, `commander` v12, `tsup` (CLI bundle), Vitest 2 + jsdom + Testing Library, ESLint 9 (flat) + Prettier 3.

**Design source:** `docs/superpowers/specs/2026-05-31-graphviz-to-reactflow-ts-migration-design.md`

---

## File Structure

```
package.json                 # npm metadata, bin: clgrapher, scripts
tsconfig.json                # strict TS, used by typecheck + editors
tsup.config.ts               # bundles src/cli/bin.ts -> dist/cli/bin.js
vite.config.ts               # root=src/web, singlefile -> dist/web/index.html
vitest.config.ts             # jsdom env, include globs
eslint.config.js             # flat config (typescript-eslint + react)
.prettierrc.json
.gitignore
src/
  core/
    types.ts                 # Edge, GraphModel, EmbeddedData
    parseTrace.ts            # parseResolveLine(), parseTrace()
    parseTrace.test.ts
    buildGraph.ts            # buildGraph()
    buildGraph.test.ts
    abbreviate.ts            # abbreviate()
    abbreviate.test.ts
  cli/
    bin.ts                   # #!/usr/bin/env node entry
    parseArgs.ts             # commander setup + back-compat shim (pure)
    parseArgs.test.ts
    buildJavaCommand.ts      # pure: options -> argv for java
    buildJavaCommand.test.ts
    runJava.ts               # spawnSync wrapper around buildJavaCommand
    emitHtml.ts              # inject EmbeddedData into template string
    emitHtml.test.ts
    open.ts                  # cross-platform "open file in browser"
    run.ts                   # orchestrates graph/run subcommands
  web/
    index.html               # has the __CLG_DATA_PLACEHOLDER__ token
    main.tsx                 # mount, load embedded data (or dev fixture)
    devFixture.ts            # small GraphModel for `vite dev`
    App.tsx                  # ReactFlow canvas + panel + legend
    state.tsx                # view-state reducer + context
    state.test.ts
    graph/
      packages.ts            # packageOf()
      view.ts                # buildVisibleGraph()  (the core view transform)
      view.test.ts
      layout.ts              # dagreLayout()
      layout.test.ts
      toReactFlow.ts         # view -> RF nodes/edges + computeHighlight()
      toReactFlow.test.ts
      types.ts               # ViewNode, ViewEdge, RF data payloads
    nodes/
      PackageNode.tsx
      ClassNode.tsx
    controls/
      Panel.tsx              # filter + abbreviate + search + expand/collapse
      Legend.tsx
tests/
  fixtures/trace.txt         # sample unified-logging trace
  cli.integration.test.ts    # `graph` on fixture -> output html contains JSON
```

Each file has one responsibility. `core` is import-clean (no Node, no React) so it unit-tests headlessly. The view transform (`web/graph/view.ts`) is the brain of the UI and is pure/tested; React components stay thin.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "classloadgrapher",
  "version": "1.0.0",
  "description": "Visualize JVM class-resolution traces as an interactive React Flow graph.",
  "type": "module",
  "bin": { "clgrapher": "dist/cli/bin.js" },
  "files": ["dist"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build:web": "vite build",
    "build:cli": "tsup",
    "build": "npm run build:web && npm run build:cli",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@dagrejs/dagre": "^1.1.4",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@types/dagre": "^0.7.52",
    "@types/node": "^20.14.15",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "@xyflow/react": "^12.3.0",
    "eslint": "^9.9.0",
    "jsdom": "^24.1.1",
    "prettier": "^3.3.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsup": "^8.2.4",
    "typescript": "^5.5.4",
    "typescript-eslint": "^8.1.0",
    "vite": "^5.4.0",
    "vite-plugin-singlefile": "^2.0.1",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests", "*.config.ts"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['src/web/**', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Create `eslint.config.js`**

```javascript
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'docs/**', 'build/**', 'node_modules/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 6: Create `.prettierrc.json`**

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
*.clgrapher-trace.txt
coverage/
```

- [ ] **Step 8: Install and verify tooling**

Run: `npm install`
Then: `npx tsc --noEmit`
Expected: `npm install` succeeds; `tsc` exits 0 (no source files yet, so no errors).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts vitest.setup.ts eslint.config.js .prettierrc.json .gitignore
git commit -m "chore: scaffold TypeScript project (vite, vitest, eslint, tsup)"
```

---

## Task 2: core — types + trace parsing (TDD)

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/parseTrace.ts`
- Test: `src/core/parseTrace.test.ts`

- [ ] **Step 1: Create `src/core/types.ts`**

```typescript
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
```

- [ ] **Step 2: Write the failing test `src/core/parseTrace.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { parseResolveLine, parseTrace } from './parseTrace';

describe('parseResolveLine', () => {
  it('parses unified-logging (JDK 9+) lines', () => {
    const line =
      '[0.012s][debug][class,resolve] java.lang.String java.io.ObjectStreamField String.java:242';
    expect(parseResolveLine(line)).toEqual({
      from: 'java.lang.String',
      to: 'java.io.ObjectStreamField',
    });
  });

  it('parses legacy RESOLVE lines', () => {
    const line = 'RESOLVE java.lang.Object java.lang.System Hello.java:1';
    expect(parseResolveLine(line)).toEqual({ from: 'java.lang.Object', to: 'java.lang.System' });
  });

  it('ignores blank and non-resolve lines', () => {
    expect(parseResolveLine('')).toBeNull();
    expect(parseResolveLine('[0.006s][info][class,load] java.lang.Object source: shared')).toBeNull();
    expect(parseResolveLine('random text')).toBeNull();
  });

  it('returns null when fewer than two tokens follow the tag', () => {
    expect(parseResolveLine('[0.1s][debug][class,resolve] OnlyOne')).toBeNull();
  });
});

describe('parseTrace', () => {
  it('collects every resolve edge in order, dropping noise', () => {
    const text = [
      '[0.001s][info][class,load] java.lang.Object source: shared',
      'RESOLVE A B x.java:1',
      '',
      '[0.012s][debug][class,resolve] C D D.java:2',
    ].join('\n');
    expect(parseTrace(text)).toEqual([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/core/parseTrace.test.ts`
Expected: FAIL — cannot resolve `./parseTrace`.

- [ ] **Step 4: Implement `src/core/parseTrace.ts`**

```typescript
import type { Edge } from './types';

/**
 * Extract `{ from, to }` from a class-resolution trace line.
 *
 * Supports both legacy `RESOLVE <from> <to> <source>` (JDK <= 8) and unified
 * logging `[..][..][class,resolve] <from> <to> <source>` (JDK 9+). Returns
 * `null` for lines that are not class-resolution entries.
 */
export function parseResolveLine(line: string): Edge | null {
  const stripped = line.trim();
  if (!stripped) return null;

  let message: string;
  if (stripped.startsWith('[')) {
    const tagEnd = stripped.lastIndexOf(']');
    if (tagEnd === -1) return null;
    if (!stripped.slice(0, tagEnd + 1).includes('class,resolve')) return null;
    message = stripped.slice(tagEnd + 1).trim();
  } else if (stripped.startsWith('RESOLVE')) {
    message = stripped.slice('RESOLVE'.length).trim();
  } else {
    return null;
  }

  const parts = message.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { from: parts[0], to: parts[1] };
}

/** Parse a whole trace into the raw (non-deduplicated) list of edges. */
export function parseTrace(text: string): Edge[] {
  const edges: Edge[] = [];
  for (const line of text.split('\n')) {
    const edge = parseResolveLine(line);
    if (edge) edges.push(edge);
  }
  return edges;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/core/parseTrace.test.ts`
Expected: PASS (6 assertions across 5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/parseTrace.ts src/core/parseTrace.test.ts
git commit -m "feat(core): port trace parsing for legacy + unified-logging formats"
```

---

## Task 3: core — buildGraph (TDD)

**Files:**
- Create: `src/core/buildGraph.ts`
- Test: `src/core/buildGraph.test.ts`

- [ ] **Step 1: Write the failing test `src/core/buildGraph.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { buildGraph } from './buildGraph';

describe('buildGraph', () => {
  it('deduplicates identical from->to edges', () => {
    const model = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'B' },
    ]);
    expect(model.edges).toEqual([{ from: 'A', to: 'B' }]);
  });

  it('keeps distinct edges that share a target (full graph, not a tree)', () => {
    const model = buildGraph([
      { from: 'A', to: 'C' },
      { from: 'B', to: 'C' },
    ]);
    expect(model.edges).toEqual([
      { from: 'A', to: 'C' },
      { from: 'B', to: 'C' },
    ]);
  });

  it('skips edges whose target is an array type', () => {
    const model = buildGraph([
      { from: 'A', to: '[Ljava.lang.String;' },
      { from: 'A', to: 'B' },
    ]);
    expect(model.edges).toEqual([{ from: 'A', to: 'B' }]);
  });

  it('collects the unique set of class names from surviving edges', () => {
    const model = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ]);
    expect([...model.classes].sort()).toEqual(['A', 'B', 'C']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/buildGraph.test.ts`
Expected: FAIL — cannot resolve `./buildGraph`.

- [ ] **Step 3: Implement `src/core/buildGraph.ts`**

```typescript
import type { Edge, GraphModel } from './types';

/**
 * Build the deduplicated class-level graph from raw resolution edges.
 *
 * - Skips edges whose target is an array type (name contains `[`), matching the
 *   original tool.
 * - Deduplicates exact `from->to` pairs.
 * - Keeps every distinct edge (the full graph). The original Python tool kept
 *   only the first edge resolving each target, collapsing the graph into a tree;
 *   the interactive UI handles density, so we preserve all edges.
 */
export function buildGraph(edges: Edge[]): GraphModel {
  const seen = new Set<string>();
  const classes = new Set<string>();
  const out: Edge[] = [];

  for (const { from, to } of edges) {
    if (to.includes('[')) continue;
    const key = `${from} ${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from, to });
    classes.add(from);
    classes.add(to);
  }

  return { classes: [...classes], edges: out };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/buildGraph.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/buildGraph.ts src/core/buildGraph.test.ts
git commit -m "feat(core): build deduplicated full-graph model from edges"
```

---

## Task 4: core — abbreviate (TDD)

> **Behavior note:** The README documents abbreviation as `java.lang. -> j.l.`, i.e. only package segments are shortened and the simple class name is kept in full (`java.lang.String -> j.l.String`). The original Python implementation had a quirk that produced `j.l.S.String`. We implement the **documented** behavior, which is the intended one.

**Files:**
- Create: `src/core/abbreviate.ts`
- Test: `src/core/abbreviate.test.ts`

- [ ] **Step 1: Write the failing test `src/core/abbreviate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { abbreviate } from './abbreviate';

describe('abbreviate', () => {
  it('shortens package segments and keeps the simple class name', () => {
    expect(abbreviate('java.lang.String')).toBe('j.l.String');
    expect(abbreviate('com.example.foo.Bar')).toBe('c.e.f.Bar');
  });

  it('returns names with no package unchanged', () => {
    expect(abbreviate('Main')).toBe('Main');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/core/abbreviate.test.ts`
Expected: FAIL — cannot resolve `./abbreviate`.

- [ ] **Step 3: Implement `src/core/abbreviate.ts`**

```typescript
/**
 * Abbreviate a fully-qualified class name by shortening each package segment to
 * its first letter while keeping the simple class name: `java.lang.String` ->
 * `j.l.String`. Names without a package are returned unchanged.
 */
export function abbreviate(fqcn: string): string {
  const parts = fqcn.split('.');
  if (parts.length <= 1) return fqcn;
  const simple = parts[parts.length - 1];
  const pkg = parts
    .slice(0, -1)
    .map((segment) => segment.charAt(0))
    .join('.');
  return `${pkg}.${simple}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/core/abbreviate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/abbreviate.ts src/core/abbreviate.test.ts
git commit -m "feat(core): abbreviate package names per documented behavior"
```

---

## Task 5: web — view types, packages, buildVisibleGraph (TDD)

This is the heart of the UI: turn the class-level `GraphModel` + view state into the set of nodes/edges to display, honoring the package-aggregated default, expansion, and the live filter.

**Files:**
- Create: `src/web/graph/types.ts`
- Create: `src/web/graph/packages.ts`
- Create: `src/web/graph/view.ts`
- Test: `src/web/graph/view.test.ts`

- [ ] **Step 1: Create `src/web/graph/types.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/web/graph/packages.ts`**

```typescript
/** The package of a fully-qualified class name (`''` for the default package). */
export function packageOf(fqcn: string): string {
  const lastDot = fqcn.lastIndexOf('.');
  return lastDot === -1 ? '' : fqcn.slice(0, lastDot);
}

/** Stable id for a collapsed package node. */
export function packageNodeId(pkg: string): string {
  return `pkg:${pkg}`;
}
```

- [ ] **Step 3: Write the failing test `src/web/graph/view.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { buildVisibleGraph } from './view';
import type { ViewState } from './types';
import type { GraphModel } from '../../core/types';

const base: ViewState = {
  filter: null,
  abbreviate: false,
  search: '',
  expandedPackages: new Set(),
  selectedNodeId: null,
};

const model: GraphModel = {
  classes: ['a.Foo', 'a.Bar', 'b.Baz'],
  edges: [
    { from: 'a.Foo', to: 'a.Bar' }, // intra-package a
    { from: 'a.Foo', to: 'b.Baz' }, // a -> b
  ],
};

describe('buildVisibleGraph', () => {
  it('aggregates by package by default and hides intra-package edges', () => {
    const view = buildVisibleGraph(model, base);
    expect(view.nodes.map((n) => n.id).sort()).toEqual(['pkg:a', 'pkg:b']);
    const pkgA = view.nodes.find((n) => n.id === 'pkg:a');
    expect(pkgA?.classCount).toBe(2);
    expect(view.edges).toEqual([{ id: 'pkg:a->pkg:b', source: 'pkg:a', target: 'pkg:b' }]);
  });

  it('expands a package into its class nodes and reroutes edges', () => {
    const view = buildVisibleGraph(model, {
      ...base,
      expandedPackages: new Set(['a']),
    });
    const ids = view.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['a.Bar', 'a.Foo', 'pkg:b']);
    // a.Foo -> a.Bar now visible (both expanded); a.Foo -> pkg:b crosses to collapsed b
    expect(view.edges).toContainEqual({ id: 'a.Foo->a.Bar', source: 'a.Foo', target: 'a.Bar' });
    expect(view.edges).toContainEqual({ id: 'a.Foo->pkg:b', source: 'a.Foo', target: 'pkg:b' });
  });

  it('drops edges whose endpoint matches the filter substring', () => {
    const view = buildVisibleGraph(model, { ...base, filter: 'b.Baz' });
    expect(view.edges).toEqual([]); // only surviving edge is intra-package a (hidden)
    expect(view.nodes.map((n) => n.id)).toEqual(['pkg:a']);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/web/graph/view.test.ts`
Expected: FAIL — cannot resolve `./view`.

- [ ] **Step 5: Implement `src/web/graph/view.ts`**

```typescript
import type { GraphModel } from '../../core/types';
import type { ViewGraph, ViewNode, ViewEdge, ViewState } from './types';
import { packageOf, packageNodeId } from './packages';

/** The display unit a class maps to: itself if its package is expanded, else its package node. */
function unitId(fqcn: string, expanded: Set<string>): string {
  const pkg = packageOf(fqcn);
  return expanded.has(pkg) ? fqcn : packageNodeId(pkg);
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

  const edgeMap = new Map<string, ViewEdge>();
  const nodeIds = new Set<string>();

  for (const edge of model.edges) {
    if (filter && (edge.from.includes(filter) || edge.to.includes(filter))) continue;

    const source = unitId(edge.from, expandedPackages);
    const target = unitId(edge.to, expandedPackages);
    if (source === target) {
      // Intra-package edge under a collapsed package: hidden, but the package node exists.
      nodeIds.add(source);
      continue;
    }
    nodeIds.add(source);
    nodeIds.add(target);
    const id = `${source}->${target}`;
    if (!edgeMap.has(id)) edgeMap.set(id, { id, source, target });
  }

  // Per-package class counts for collapsed package labels.
  const counts = new Map<string, number>();
  for (const fqcn of model.classes) {
    const pkg = packageOf(fqcn);
    counts.set(pkg, (counts.get(pkg) ?? 0) + 1);
  }

  const nodes: ViewNode[] = [...nodeIds].map((id) => {
    if (id.startsWith('pkg:')) {
      const pkg = id.slice('pkg:'.length);
      return { id, kind: 'package', package: pkg, classCount: counts.get(pkg) ?? 0 };
    }
    return { id, kind: 'class', package: packageOf(id), fqcn: id };
  });

  return { nodes, edges: [...edgeMap.values()] };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/web/graph/view.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/web/graph/types.ts src/web/graph/packages.ts src/web/graph/view.ts src/web/graph/view.test.ts
git commit -m "feat(web): package-aggregated view derivation with filter + expansion"
```

---

## Task 6: web — dagre layout (TDD)

**Files:**
- Create: `src/web/graph/layout.ts`
- Test: `src/web/graph/layout.test.ts`

- [ ] **Step 1: Write the failing test `src/web/graph/layout.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { dagreLayout } from './layout';

describe('dagreLayout', () => {
  it('assigns a numeric position to every node', () => {
    const positioned = dagreLayout(
      [
        { id: 'a', width: 120, height: 36 },
        { id: 'b', width: 120, height: 36 },
      ],
      [{ id: 'a->b', source: 'a', target: 'b' }],
    );
    const byId = Object.fromEntries(positioned.map((n) => [n.id, n.position]));
    expect(typeof byId.a.x).toBe('number');
    expect(typeof byId.a.y).toBe('number');
    expect(typeof byId.b.x).toBe('number');
  });

  it('places a target below its source for top-to-bottom layout', () => {
    const positioned = dagreLayout(
      [
        { id: 'a', width: 120, height: 36 },
        { id: 'b', width: 120, height: 36 },
      ],
      [{ id: 'a->b', source: 'a', target: 'b' }],
    );
    const a = positioned.find((n) => n.id === 'a')!;
    const b = positioned.find((n) => n.id === 'b')!;
    expect(b.position.y).toBeGreaterThan(a.position.y);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/web/graph/layout.test.ts`
Expected: FAIL — cannot resolve `./layout`.

- [ ] **Step 3: Implement `src/web/graph/layout.ts`**

```typescript
import dagre from '@dagrejs/dagre';

export interface LayoutInput {
  id: string;
  width: number;
  height: number;
}

export interface Positioned extends LayoutInput {
  position: { x: number; y: number };
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

/** Lay nodes out top-to-bottom with dagre, returning React-Flow-style positions. */
export function dagreLayout(
  nodes: LayoutInput[],
  edges: LayoutEdge[],
  rankdir: 'TB' | 'LR' = 'TB',
): Positioned[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir, nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 });

  for (const node of nodes) g.setNode(node.id, { width: node.width, height: node.height });
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // dagre centers nodes; React Flow positions by top-left corner.
  return nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return { ...node, position: { x: x - node.width / 2, y: y - node.height / 2 } };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/web/graph/layout.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/web/graph/layout.ts src/web/graph/layout.test.ts
git commit -m "feat(web): dagre top-to-bottom layout wrapper"
```

---

## Task 7: web — toReactFlow + computeHighlight (TDD)

**Files:**
- Create: `src/web/graph/toReactFlow.ts`
- Test: `src/web/graph/toReactFlow.test.ts`

- [ ] **Step 1: Write the failing test `src/web/graph/toReactFlow.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { computeHighlight, estimateSize, nodeLabel } from './toReactFlow';
import type { ViewGraph, ViewNode } from './types';

const classNode = (fqcn: string): ViewNode => ({
  id: fqcn,
  kind: 'class',
  package: 'a',
  fqcn,
});

describe('nodeLabel', () => {
  it('abbreviates class labels when requested', () => {
    expect(nodeLabel(classNode('a.b.Foo'), false)).toBe('a.b.Foo');
    expect(nodeLabel(classNode('a.b.Foo'), true)).toBe('a.Foo');
  });

  it('labels package nodes with name and count', () => {
    const pkg: ViewNode = { id: 'pkg:a.b', kind: 'package', package: 'a.b', classCount: 5 };
    expect(nodeLabel(pkg, false)).toBe('a.b (5)');
  });
});

describe('estimateSize', () => {
  it('returns a width that grows with label length and a fixed height', () => {
    const small = estimateSize('Foo');
    const big = estimateSize('a.very.long.package.Name');
    expect(big.width).toBeGreaterThan(small.width);
    expect(small.height).toBe(40);
  });
});

describe('computeHighlight', () => {
  const view: ViewGraph = {
    nodes: [classNode('a.A'), classNode('a.B'), classNode('a.C')],
    edges: [
      { id: 'a.A->a.B', source: 'a.A', target: 'a.B' },
      { id: 'a.B->a.C', source: 'a.B', target: 'a.C' },
    ],
  };

  it('marks nothing when there is no selection', () => {
    const h = computeHighlight(view, null);
    expect(h.active).toBe(false);
  });

  it('marks the selected node, its neighbors, and incident edges', () => {
    const h = computeHighlight(view, 'a.B');
    expect(h.active).toBe(true);
    expect([...h.nodes].sort()).toEqual(['a.A', 'a.B', 'a.C']);
    expect([...h.edges].sort()).toEqual(['a.A->a.B', 'a.B->a.C']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/web/graph/toReactFlow.test.ts`
Expected: FAIL — cannot resolve `./toReactFlow`.

- [ ] **Step 3: Implement `src/web/graph/toReactFlow.ts`**

```typescript
import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import { abbreviate } from '../../core/abbreviate';
import type { ViewGraph, ViewNode } from './types';
import { dagreLayout } from './layout';

export interface ClgNodeData extends Record<string, unknown> {
  label: string;
  kind: 'package' | 'class';
  package: string;
  dimmed: boolean;
}

export interface Highlight {
  active: boolean;
  nodes: Set<string>;
  edges: Set<string>;
}

/** Human-readable label for a view node, honoring the abbreviate toggle. */
export function nodeLabel(node: ViewNode, abbrev: boolean): string {
  if (node.kind === 'package') return `${node.package} (${node.classCount ?? 0})`;
  const fqcn = node.fqcn ?? node.id;
  return abbrev ? abbreviate(fqcn) : fqcn;
}

/** Rough node box size based on label length (dagre needs sizes up front). */
export function estimateSize(label: string): { width: number; height: number } {
  return { width: Math.max(120, label.length * 7.5 + 24), height: 40 };
}

/** Which nodes/edges to emphasize given the selected node (its closed neighborhood). */
export function computeHighlight(view: ViewGraph, selectedId: string | null): Highlight {
  if (!selectedId) return { active: false, nodes: new Set(), edges: new Set() };
  const nodes = new Set<string>([selectedId]);
  const edges = new Set<string>();
  for (const edge of view.edges) {
    if (edge.source === selectedId || edge.target === selectedId) {
      edges.add(edge.id);
      nodes.add(edge.source);
      nodes.add(edge.target);
    }
  }
  return { active: true, nodes, edges };
}

/** Convert a view graph into laid-out React Flow nodes and edges. */
export function toReactFlow(
  view: ViewGraph,
  abbrev: boolean,
  selectedId: string | null,
): { nodes: RFNode<ClgNodeData>[]; edges: RFEdge[] } {
  const highlight = computeHighlight(view, selectedId);

  const layoutInput = view.nodes.map((n) => {
    const label = nodeLabel(n, abbrev);
    return { id: n.id, ...estimateSize(label) };
  });
  const positioned = dagreLayout(layoutInput, view.edges);
  const positionById = new Map(positioned.map((p) => [p.id, p.position]));

  const nodes: RFNode<ClgNodeData>[] = view.nodes.map((n) => ({
    id: n.id,
    type: n.kind === 'package' ? 'clgPackage' : 'clgClass',
    position: positionById.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: nodeLabel(n, abbrev),
      kind: n.kind,
      package: n.package,
      dimmed: highlight.active && !highlight.nodes.has(n.id),
    },
  }));

  const edges: RFEdge[] = view.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: false,
    style: {
      opacity: highlight.active && !highlight.edges.has(e.id) ? 0.12 : 1,
    },
  }));

  return { nodes, edges };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/web/graph/toReactFlow.test.ts`
Expected: PASS (6 assertions across 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/web/graph/toReactFlow.ts src/web/graph/toReactFlow.test.ts
git commit -m "feat(web): map view graph to laid-out React Flow nodes with highlight"
```

---

## Task 8: web — view-state reducer + context (TDD)

**Files:**
- Create: `src/web/state.tsx`
- Test: `src/web/state.test.ts`

- [ ] **Step 1: Write the failing test `src/web/state.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { reduce, initialState } from './state';
import type { GraphModel } from '../core/types';

const model: GraphModel = {
  classes: ['a.A', 'b.B'],
  edges: [{ from: 'a.A', to: 'b.B' }],
};

describe('reduce', () => {
  it('seeds filter/abbreviate from embedded opts', () => {
    const s = initialState({ abbreviate: true, filter: 'x' });
    expect(s.abbreviate).toBe(true);
    expect(s.filter).toBe('x');
    expect(s.expandedPackages.size).toBe(0);
  });

  it('toggles a package in expandedPackages', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'toggleExpand', pkg: 'a' });
    expect(s.expandedPackages.has('a')).toBe(true);
    s = reduce(s, { type: 'toggleExpand', pkg: 'a' });
    expect(s.expandedPackages.has('a')).toBe(false);
  });

  it('expandAll fills from the model packages, collapseAll clears', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'expandAll', model });
    expect([...s.expandedPackages].sort()).toEqual(['a', 'b']);
    s = reduce(s, { type: 'collapseAll' });
    expect(s.expandedPackages.size).toBe(0);
  });

  it('sets filter and selection', () => {
    let s = initialState({ abbreviate: false, filter: null });
    s = reduce(s, { type: 'setFilter', value: 'foo' });
    expect(s.filter).toBe('foo');
    s = reduce(s, { type: 'select', id: 'a.A' });
    expect(s.selectedNodeId).toBe('a.A');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/web/state.test.ts`
Expected: FAIL — cannot resolve `./state`.

- [ ] **Step 3: Implement `src/web/state.tsx`**

```tsx
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { GraphModel } from '../core/types';
import type { ViewState } from './graph/types';
import { packageOf } from './graph/packages';
import type { EmbeddedOpts } from '../core/types';

export type Action =
  | { type: 'setFilter'; value: string }
  | { type: 'toggleAbbreviate' }
  | { type: 'setSearch'; value: string }
  | { type: 'toggleExpand'; pkg: string }
  | { type: 'expandAll'; model: GraphModel }
  | { type: 'collapseAll' }
  | { type: 'select'; id: string | null };

export function initialState(opts: EmbeddedOpts): ViewState {
  return {
    filter: opts.filter,
    abbreviate: opts.abbreviate,
    search: '',
    expandedPackages: new Set<string>(),
    selectedNodeId: null,
  };
}

export function reduce(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case 'setFilter':
      return { ...state, filter: action.value || null };
    case 'toggleAbbreviate':
      return { ...state, abbreviate: !state.abbreviate };
    case 'setSearch':
      return { ...state, search: action.value };
    case 'toggleExpand': {
      const next = new Set(state.expandedPackages);
      if (next.has(action.pkg)) next.delete(action.pkg);
      else next.add(action.pkg);
      return { ...state, expandedPackages: next };
    }
    case 'expandAll': {
      const next = new Set<string>();
      for (const fqcn of action.model.classes) next.add(packageOf(fqcn));
      return { ...state, expandedPackages: next };
    }
    case 'collapseAll':
      return { ...state, expandedPackages: new Set<string>() };
    case 'select':
      return { ...state, selectedNodeId: action.id };
    default:
      return state;
  }
}

const StateContext = createContext<ViewState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function StateProvider({ opts, children }: { opts: EmbeddedOpts; children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, opts, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useViewState(): ViewState {
  const s = useContext(StateContext);
  if (!s) throw new Error('useViewState must be used within StateProvider');
  return s;
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchContext);
  if (!d) throw new Error('useDispatch must be used within StateProvider');
  return d;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/web/state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/web/state.tsx src/web/state.test.ts
git commit -m "feat(web): view-state reducer and React context"
```

---

## Task 9: web — custom nodes, controls, legend (impl)

**Files:**
- Create: `src/web/nodes/PackageNode.tsx`
- Create: `src/web/nodes/ClassNode.tsx`
- Create: `src/web/controls/Panel.tsx`
- Create: `src/web/controls/Legend.tsx`

- [ ] **Step 1: Implement `src/web/nodes/ClassNode.tsx`**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ClgNodeData } from '../graph/toReactFlow';

export function ClassNode({ data, selected }: NodeProps) {
  const d = data as ClgNodeData;
  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        border: `1px solid ${selected ? '#2563eb' : '#94a3b8'}`,
        background: '#ffffff',
        fontSize: 12,
        fontFamily: 'ui-monospace, monospace',
        opacity: d.dimmed ? 0.25 : 1,
        whiteSpace: 'nowrap',
      }}
      title={d.label}
    >
      <Handle type="target" position={Position.Top} />
      {d.label}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/web/nodes/PackageNode.tsx`**

The package node exposes an expand toggle. It dispatches `toggleExpand` for its package.

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ClgNodeData } from '../graph/toReactFlow';
import { useDispatch } from '../state';

export function PackageNode({ id, data, selected }: NodeProps) {
  const d = data as ClgNodeData;
  const dispatch = useDispatch();
  const pkg = id.startsWith('pkg:') ? id.slice('pkg:'.length) : d.package;
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: `2px solid ${selected ? '#2563eb' : '#64748b'}`,
        background: '#f1f5f9',
        fontSize: 13,
        fontWeight: 600,
        opacity: d.dimmed ? 0.25 : 1,
        whiteSpace: 'nowrap',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
      title={`${pkg} — click + to expand`}
    >
      <Handle type="target" position={Position.Top} />
      <span>{d.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dispatch({ type: 'toggleExpand', pkg });
        }}
        style={{ cursor: 'pointer', border: '1px solid #94a3b8', borderRadius: 4, lineHeight: 1 }}
        aria-label={`Expand package ${pkg}`}
      >
        +
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/web/controls/Legend.tsx`**

```tsx
export function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 5,
        background: '#ffffffee',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        maxWidth: 260,
      }}
    >
      <strong>ClassLoadGrapher</strong>
      <div>A → B : class A resolves class B</div>
      <div style={{ marginTop: 4, color: '#475569' }}>
        Boxes are packages by default; click <code>+</code> to expand into classes.
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/web/controls/Panel.tsx`**

```tsx
import type { GraphModel } from '../../core/types';
import { useDispatch, useViewState } from '../state';

export function Panel({ model }: { model: GraphModel }) {
  const state = useViewState();
  const dispatch = useDispatch();
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 5,
        background: '#ffffffee',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 240,
        fontSize: 13,
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        Filter (hide classes containing)
        <input
          value={state.filter ?? ''}
          placeholder="e.g. sun.reflect"
          onChange={(e) => dispatch({ type: 'setFilter', value: e.target.value })}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        Search (highlight)
        <input
          value={state.search}
          placeholder="locate a class/package"
          onChange={(e) => dispatch({ type: 'setSearch', value: e.target.value })}
        />
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={state.abbreviate}
          onChange={() => dispatch({ type: 'toggleAbbreviate' })}
        />
        Abbreviate (java.lang. → j.l.)
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => dispatch({ type: 'expandAll', model })}>
          Expand all
        </button>
        <button type="button" onClick={() => dispatch({ type: 'collapseAll' })}>
          Collapse all
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/web/nodes src/web/controls
git commit -m "feat(web): custom package/class nodes, control panel, legend"
```

---

## Task 10: web — App, mount, dev fixture, index.html (impl + smoke test)

**Files:**
- Create: `src/web/App.tsx`
- Create: `src/web/main.tsx`
- Create: `src/web/devFixture.ts`
- Create: `src/web/index.html`
- Test: `src/web/App.test.tsx`

- [ ] **Step 1: Implement `src/web/App.tsx`**

The App reads the model, derives the view via `buildVisibleGraph`, lays it out, and renders React Flow. Search matches highlight by selecting the first matching node.

```tsx
import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphModel } from '../core/types';
import { buildVisibleGraph } from './graph/view';
import { toReactFlow } from './graph/toReactFlow';
import { useDispatch, useViewState } from './state';
import { PackageNode } from './nodes/PackageNode';
import { ClassNode } from './nodes/ClassNode';
import { Panel } from './controls/Panel';
import { Legend } from './controls/Legend';

const nodeTypes = { clgPackage: PackageNode, clgClass: ClassNode };

function Canvas({ model }: { model: GraphModel }) {
  const state = useViewState();
  const dispatch = useDispatch();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Search resolves to a node id to highlight (first id containing the term).
  const searchId = useMemo(() => {
    if (!state.search) return state.selectedNodeId;
    const view = buildVisibleGraph(model, state);
    const hit = view.nodes.find((n) => n.id.includes(state.search));
    return hit?.id ?? state.selectedNodeId;
  }, [model, state]);

  useEffect(() => {
    const view = buildVisibleGraph(model, state);
    const rf = toReactFlow(view, state.abbreviate, searchId);
    setNodes(rf.nodes);
    setEdges(rf.edges);
  }, [model, state, searchId, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = (_, node) => {
    dispatch({ type: 'select', id: node.id });
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={() => dispatch({ type: 'select', id: null })}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.05}
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
      <Panel model={model} />
      <Legend />
    </ReactFlow>
  );
}

export function App({ model }: { model: GraphModel }) {
  if (model.edges.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h2>No class resolutions found</h2>
        <p>
          The trace contained no <code>class,resolve</code> entries. Re-run with{' '}
          <code>-Xlog:class+resolve=debug</code> (JDK 9+) or{' '}
          <code>-XX:+TraceClassResolution</code> (JDK ≤ 8).
        </p>
      </div>
    );
  }
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
        <Canvas model={model} />
      </ReactFlowProvider>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/web/devFixture.ts`**

```typescript
import type { EmbeddedData } from '../core/types';

/** Used only by `vite dev`, when no real data has been injected. */
export const devFixture: EmbeddedData = {
  graph: {
    classes: ['java.lang.Object', 'java.lang.String', 'java.io.PrintStream', 'app.Main'],
    edges: [
      { from: 'app.Main', to: 'java.lang.String' },
      { from: 'app.Main', to: 'java.io.PrintStream' },
      { from: 'java.lang.String', to: 'java.lang.Object' },
    ],
  },
  opts: { abbreviate: false, filter: null },
};
```

- [ ] **Step 3: Implement `src/web/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EmbeddedData } from '../core/types';
import { App } from './App';
import { StateProvider } from './state';
import { devFixture } from './devFixture';

const PLACEHOLDER = '__CLG_DATA_PLACEHOLDER__';

function loadData(): EmbeddedData {
  const el = document.getElementById('clg-data');
  const raw = el?.textContent?.trim() ?? '';
  if (!raw || raw === PLACEHOLDER) return devFixture;
  try {
    return JSON.parse(raw) as EmbeddedData;
  } catch {
    return devFixture;
  }
}

const data = loadData();
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <StateProvider opts={data.opts}>
      <App model={data.graph} />
    </StateProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Implement `src/web/index.html`**

The data lives in a `type="application/json"` script so the placeholder never executes; the CLI replaces only the placeholder token.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ClassLoadGrapher</title>
    <style>
      html, body, #root { margin: 0; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script id="clg-data" type="application/json">__CLG_DATA_PLACEHOLDER__</script>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write the smoke test `src/web/App.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { StateProvider } from './state';
import type { GraphModel } from '../core/types';

const model: GraphModel = {
  classes: ['a.Foo', 'b.Bar'],
  edges: [{ from: 'a.Foo', to: 'b.Bar' }],
};

describe('App', () => {
  it('renders package nodes from the model', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={model} />
      </StateProvider>,
    );
    expect(screen.getByText('a (1)')).toBeInTheDocument();
    expect(screen.getByText('b (1)')).toBeInTheDocument();
  });

  it('shows an empty state when there are no edges', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={{ classes: [], edges: [] }} />
      </StateProvider>,
    );
    expect(screen.getByText('No class resolutions found')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npx vitest run src/web/App.test.tsx`
Expected: PASS. (React Flow renders in jsdom; we assert on node label text, which renders even without layout measurement.)

> If React Flow logs a benign "width/height is 0" warning under jsdom, that is expected and does not fail the test.

- [ ] **Step 7: Commit**

```bash
git add src/web/App.tsx src/web/main.tsx src/web/devFixture.ts src/web/index.html src/web/App.test.tsx
git commit -m "feat(web): App canvas, mount, embedded-data loader, empty state"
```

---

## Task 11: web — Vite single-file build

**Files:**
- Create: `vite.config.ts`

- [ ] **Step 1: Implement `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'src/web'),
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
  },
});
```

- [ ] **Step 2: Build the web template**

Run: `npm run build:web`
Expected: produces `dist/web/index.html` as a single file (all JS/CSS inlined).

- [ ] **Step 3: Verify the template is self-contained and keeps the placeholder**

Run: `node -e "const h=require('fs').readFileSync('dist/web/index.html','utf8'); if(!h.includes('__CLG_DATA_PLACEHOLDER__')) throw new Error('placeholder missing'); if(/<script[^>]+src=/.test(h)) throw new Error('external script remains — not self-contained'); console.log('ok: self-contained,', (h.length/1024|0)+'KB');"`
Expected: prints `ok: self-contained, <NNN>KB`. (The `clg-data` script is `type="application/json"`, so it is not matched by the external-`src` check.)

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "build(web): single-file Vite build to dist/web/index.html"
```

---

## Task 12: cli — buildJavaCommand (TDD)

**Files:**
- Create: `src/cli/buildJavaCommand.ts`
- Test: `src/cli/buildJavaCommand.test.ts`

- [ ] **Step 1: Write the failing test `src/cli/buildJavaCommand.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { buildJavaArgs, xlogArg } from './buildJavaCommand';

describe('buildJavaArgs', () => {
  it('prepends the xlog flag and a -jar invocation', () => {
    const args = buildJavaArgs({ tracePath: '/t/trace.txt', jar: 'app.jar' });
    expect(args[0]).toBe(xlogArg('/t/trace.txt'));
    expect(args.slice(1)).toEqual(['-jar', 'app.jar']);
  });

  it('builds a -cp invocation with trailing main/args', () => {
    const args = buildJavaArgs({
      tracePath: '/t/trace.txt',
      classpath: 'build',
      rest: ['com.example.Main', '--flag'],
    });
    expect(args.slice(1)).toEqual(['-cp', 'build', 'com.example.Main', '--flag']);
  });

  it('passes raw args verbatim after the xlog flag', () => {
    const args = buildJavaArgs({ tracePath: '/t/trace.txt', rest: ['-jar', 'x.jar'] });
    expect(args.slice(1)).toEqual(['-jar', 'x.jar']);
  });

  it('throws when there is nothing to run', () => {
    expect(() => buildJavaArgs({ tracePath: '/t/trace.txt' })).toThrow(/nothing to run/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cli/buildJavaCommand.test.ts`
Expected: FAIL — cannot resolve `./buildJavaCommand`.

- [ ] **Step 3: Implement `src/cli/buildJavaCommand.ts`**

```typescript
const XLOG_TAGS = 'class+resolve=debug';

/** The unified-logging flag that writes the resolution trace to `path`. */
export function xlogArg(path: string): string {
  return `-Xlog:${XLOG_TAGS}:file=${path}`;
}

export interface JavaRunOptions {
  tracePath: string;
  jar?: string;
  classpath?: string;
  rest?: string[];
}

/**
 * Assemble the argument list for the `java` launcher. Order: xlog flag, then a
 * `-jar`/`-cp` invocation (if given), then any raw passthrough args.
 */
export function buildJavaArgs(opts: JavaRunOptions): string[] {
  const rest = opts.rest ?? [];
  const invocation: string[] = [];
  if (opts.classpath) invocation.push('-cp', opts.classpath);
  if (opts.jar) invocation.push('-jar', opts.jar);
  invocation.push(...rest);

  if (invocation.length === 0) {
    throw new Error(
      'Nothing to run. Provide --jar <jar>, a main class via --cp <classpath> <Main>, ' +
        "or '-- <java args>'.",
    );
  }
  return [xlogArg(opts.tracePath), ...invocation];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cli/buildJavaCommand.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cli/buildJavaCommand.ts src/cli/buildJavaCommand.test.ts
git commit -m "feat(cli): assemble java launcher argv with xlog flag"
```

---

## Task 13: cli — emitHtml (TDD)

**Files:**
- Create: `src/cli/emitHtml.ts`
- Test: `src/cli/emitHtml.test.ts`

- [ ] **Step 1: Write the failing test `src/cli/emitHtml.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { injectData } from './emitHtml';
import type { EmbeddedData } from '../core/types';

const data: EmbeddedData = {
  graph: { classes: ['a.A'], edges: [{ from: 'a.A', to: 'a.A' }] },
  opts: { abbreviate: true, filter: null },
};

const template =
  '<script id="clg-data" type="application/json">__CLG_DATA_PLACEHOLDER__</script>';

describe('injectData', () => {
  it('replaces the placeholder with JSON and round-trips', () => {
    const html = injectData(template, data);
    expect(html).not.toContain('__CLG_DATA_PLACEHOLDER__');
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'));
    expect(JSON.parse(json)).toEqual(data);
  });

  it('escapes < to avoid breaking out of the script tag', () => {
    const tricky: EmbeddedData = {
      graph: { classes: ['</script>'], edges: [] },
      opts: { abbreviate: false, filter: null },
    };
    const html = injectData(template, tricky);
    expect(html).not.toContain('</script><');
    expect(html).toContain('\\u003c');
  });

  it('throws if the placeholder is missing', () => {
    expect(() => injectData('<html></html>', data)).toThrow(/placeholder/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cli/emitHtml.test.ts`
Expected: FAIL — cannot resolve `./emitHtml`.

- [ ] **Step 3: Implement `src/cli/emitHtml.ts`**

```typescript
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { EmbeddedData } from '../core/types';

const PLACEHOLDER = '__CLG_DATA_PLACEHOLDER__';

/** Inject the model JSON into the template, escaping `<` so it cannot break the script tag. */
export function injectData(template: string, data: EmbeddedData): string {
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`Template is missing the ${PLACEHOLDER} placeholder.`);
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return template.replace(PLACEHOLDER, json);
}

/** Resolve the bundled web template (dist/web/index.html relative to the CLI). */
export function templatePath(): string {
  return fileURLToPath(new URL('../web/index.html', import.meta.url));
}

/** Read the template, inject data, and write `<dest>.html`. Returns the output path. */
export async function emitHtml(dest: string, data: EmbeddedData): Promise<string> {
  const template = await readFile(templatePath(), 'utf8');
  const html = injectData(template, data);
  const outPath = dest.endsWith('.html') ? dest : `${dest}.html`;
  await writeFile(outPath, html, 'utf8');
  return outPath;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cli/emitHtml.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cli/emitHtml.ts src/cli/emitHtml.test.ts
git commit -m "feat(cli): inject graph model into HTML template and write output"
```

---

## Task 14: cli — argument parsing + back-compat shim (TDD)

**Files:**
- Create: `src/cli/parseArgs.ts`
- Test: `src/cli/parseArgs.test.ts`

- [ ] **Step 1: Write the failing test `src/cli/parseArgs.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeArgv, parseArgs } from './parseArgs';

describe('normalizeArgv (back-compat shim)', () => {
  it('prepends "graph" when the first token is not a known command/flag', () => {
    expect(normalizeArgv(['trace.txt', 'out'])).toEqual(['graph', 'trace.txt', 'out']);
  });

  it('leaves explicit subcommands untouched', () => {
    expect(normalizeArgv(['graph', 't', 'o'])).toEqual(['graph', 't', 'o']);
    expect(normalizeArgv(['run', 'out', '--jar', 'a.jar'])).toEqual(['run', 'out', '--jar', 'a.jar']);
  });

  it('leaves global flags untouched', () => {
    expect(normalizeArgv(['--version'])).toEqual(['--version']);
  });
});

describe('parseArgs', () => {
  it('parses the graph subcommand with common options', () => {
    const r = parseArgs(['graph', 'trace.txt', 'out', '-abrv', '-f', 'sun']);
    expect(r).toMatchObject({
      command: 'graph',
      raw: 'trace.txt',
      dest: 'out',
      abbreviate: true,
      filter: 'sun',
    });
  });

  it('parses the run subcommand and collects java args after --', () => {
    const r = parseArgs(['run', 'out', '--cp', 'build', '--', 'com.example.Main', '--flag']);
    expect(r).toMatchObject({ command: 'run', dest: 'out', classpath: 'build' });
    expect(r.javaArgs).toEqual(['com.example.Main', '--flag']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/cli/parseArgs.test.ts`
Expected: FAIL — cannot resolve `./parseArgs`.

- [ ] **Step 3: Implement `src/cli/parseArgs.ts`**

```typescript
import { Command } from 'commander';

export interface ParsedArgs {
  command: 'graph' | 'run';
  dest: string;
  raw?: string; // graph: input trace file
  abbreviate: boolean;
  filter: string | null;
  view: boolean;
  jar?: string;
  classpath?: string;
  java: string;
  keepTrace?: string;
  javaArgs: string[];
}

const KNOWN_FIRST = new Set(['graph', 'run', '-h', '--help', '--version', '-V']);

/** Back-compat: bare `clgrapher <trace> <dest>` still means `graph <trace> <dest>`. */
export function normalizeArgv(argv: string[]): string[] {
  if (argv.length > 0 && !KNOWN_FIRST.has(argv[0])) return ['graph', ...argv];
  return argv;
}

export function parseArgs(argv: string[]): ParsedArgs {
  let parsed: ParsedArgs | null = null;
  const program = new Command();
  program.name('clgrapher').version('1.0.0', '-V, --version').exitOverride();

  const common = (cmd: Command): Command =>
    cmd
      .option('-abrv', 'abbreviate package names, e.g. java.lang. -> j.l.', false)
      .option('-f, --filter <str>', 'hide classes whose name contains this string')
      .option('--view', 'open the generated HTML in a browser', false);

  common(program.command('graph'))
    .argument('<trace_file>', 'class-resolution trace file')
    .argument('<destination>', 'destination file (.html appended if missing)')
    .action((traceFile: string, destination: string, opts: Record<string, unknown>) => {
      parsed = {
        command: 'graph',
        raw: traceFile,
        dest: destination,
        abbreviate: Boolean(opts.Abrv ?? opts.abrv),
        filter: (opts.filter as string) ?? null,
        view: Boolean(opts.view),
        java: 'java',
        javaArgs: [],
      };
    });

  common(program.command('run'))
    .argument('<destination>', 'destination file (.html appended if missing)')
    .option('--jar <jar>', 'run an executable jar (java -jar <jar>)')
    .option('--cp, --classpath <cp>', 'classpath passed to java -cp')
    .option('--java <path>', 'path to the java launcher', 'java')
    .option('--keep-trace <file>', 'write the captured trace here and keep it')
    .argument('[javaArgs...]', "main class / args; put option-like args after '--'")
    .action((destination: string, javaArgs: string[], opts: Record<string, unknown>) => {
      parsed = {
        command: 'run',
        dest: destination,
        abbreviate: Boolean(opts.Abrv ?? opts.abrv),
        filter: (opts.filter as string) ?? null,
        view: Boolean(opts.view),
        jar: opts.jar as string | undefined,
        classpath: opts.classpath as string | undefined,
        java: (opts.java as string) ?? 'java',
        keepTrace: opts.keepTrace as string | undefined,
        javaArgs: javaArgs ?? [],
      };
    });

  program.parse(normalizeArgv(argv), { from: 'user' });
  if (!parsed) throw new Error('No subcommand matched.');
  return parsed;
}
```

> **Note on the `-abrv` flag:** commander stores the single-dash long-ish flag `-abrv` under a camelCased key; the implementation reads both `opts.Abrv` and `opts.abrv` to be safe. The test asserts `abbreviate: true` is produced — if the key differs in your commander version, adjust the read in `.action` (this is the one place to verify against the installed commander).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/cli/parseArgs.test.ts`
Expected: PASS (5 tests). If the `-abrv` assertion fails, inspect the `opts` object (add a temporary `console.log(opts)`), fix the key read, and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/cli/parseArgs.ts src/cli/parseArgs.test.ts
git commit -m "feat(cli): commander arg parsing with graph/run and back-compat shim"
```

---

## Task 15: cli — runJava, open, run orchestration, bin (impl + integration test)

**Files:**
- Create: `src/cli/runJava.ts`
- Create: `src/cli/open.ts`
- Create: `src/cli/run.ts`
- Create: `src/cli/bin.ts`
- Create: `tests/fixtures/trace.txt`
- Test: `tests/cli.integration.test.ts`

- [ ] **Step 1: Implement `src/cli/runJava.ts`**

```typescript
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildJavaArgs, type JavaRunOptions } from './buildJavaCommand';

export interface RunJavaResult {
  tracePath: string;
  /** True when this is a temp file the caller should delete after use. */
  ephemeral: boolean;
}

/**
 * Launch a Java program with the class-resolution xlog flag and capture its
 * trace. `keepTrace` (if given) is the trace path to write and keep; otherwise a
 * temp file is created and reported as ephemeral.
 */
export function runJava(
  opts: Omit<JavaRunOptions, 'tracePath'>,
  java = 'java',
  keepTrace?: string,
): RunJavaResult {
  const tracePath = keepTrace ?? join(mkdtempSync(join(tmpdir(), 'clg-')), 'trace.txt');
  const args = buildJavaArgs({ ...opts, tracePath });

  const result = spawnSync(java, args, { stdio: 'inherit' });
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Could not launch '${java}': not found on PATH.`);
    }
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    process.stderr.write(
      `warning: Java exited with code ${result.status}; graphing the trace captured so far\n`,
    );
  }
  return { tracePath, ephemeral: keepTrace === undefined };
}

/** Best-effort delete of an ephemeral trace file and its temp directory. */
export function cleanupTrace(tracePath: string): void {
  try {
    rmSync(join(tracePath, '..'), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 2: Implement `src/cli/open.ts`**

```typescript
import { spawn } from 'node:child_process';

/** Open a file with the OS default handler (best-effort; never throws). */
export function openInBrowser(path: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(cmd, [path], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' });
    child.unref();
  } catch {
    /* ignore — opening is a convenience */
  }
}
```

- [ ] **Step 3: Implement `src/cli/run.ts`**

```typescript
import { readFile } from 'node:fs/promises';
import { parseTrace } from '../core/parseTrace';
import { buildGraph } from '../core/buildGraph';
import type { EmbeddedData } from '../core/types';
import { emitHtml } from './emitHtml';
import { runJava, cleanupTrace } from './runJava';
import { openInBrowser } from './open';
import type { ParsedArgs } from './parseArgs';

/** Execute a parsed CLI invocation. Returns the output HTML path. */
export async function run(args: ParsedArgs): Promise<string> {
  let tracePath: string;
  let ephemeral = false;

  if (args.command === 'run') {
    const rest = args.javaArgs[0] === '--' ? args.javaArgs.slice(1) : args.javaArgs;
    const result = runJava(
      { jar: args.jar, classpath: args.classpath, rest },
      args.java,
      args.keepTrace,
    );
    tracePath = result.tracePath;
    ephemeral = result.ephemeral;
  } else {
    if (!args.raw) throw new Error('graph requires a trace file.');
    tracePath = args.raw;
  }

  try {
    const text = await readFile(tracePath, 'utf8');
    const graph = buildGraph(parseTrace(text));
    const data: EmbeddedData = { graph, opts: { abbreviate: args.abbreviate, filter: args.filter } };
    const outPath = await emitHtml(args.dest, data);
    if (args.view) openInBrowser(outPath);
    return outPath;
  } finally {
    if (ephemeral) cleanupTrace(tracePath);
  }
}
```

- [ ] **Step 4: Implement `src/cli/bin.ts`**

```typescript
#!/usr/bin/env node
import { parseArgs } from './parseArgs';
import { run } from './run';

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const outPath = await run(args);
    process.stdout.write(`Wrote ${outPath}\n`);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}

void main();
```

- [ ] **Step 5: Create `tests/fixtures/trace.txt`**

```
[0.001s][info ][class,load   ] java.lang.Object source: shared objects file
[0.012s][debug][class,resolve] app.Main java.lang.String String.java:1
[0.013s][debug][class,resolve] app.Main java.io.PrintStream Main.java:5
[0.014s][debug][class,resolve] java.lang.String java.lang.Object String.java:2
[0.015s][debug][class,resolve] app.Main app.util.Helper Main.java:9
```

- [ ] **Step 6: Create `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { 'cli/bin': 'src/cli/bin.ts' },
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  clean: false, // keep dist/web from the vite build
  banner: { js: '#!/usr/bin/env node' },
});
```

- [ ] **Step 7: Write the integration test `tests/cli.integration.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from '../src/cli/parseArgs';
import { run } from '../src/cli/run';

describe('graph subcommand (integration)', () => {
  it('parses a fixture trace and writes self-contained HTML with the model embedded', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'clg-it-'));
    const dest = join(outDir, 'out');
    const args = parseArgs(['graph', 'tests/fixtures/trace.txt', dest]);
    const outPath = await run(args);

    expect(outPath).toBe(`${dest}.html`);
    const html = readFileSync(outPath, 'utf8');
    expect(html).not.toContain('__CLG_DATA_PLACEHOLDER__');
    // The embedded JSON should contain a known edge from the fixture.
    expect(html).toContain('app.Main');
    expect(html).toContain('java.io.PrintStream');
    // Array-target and noise lines must not appear as edges (none in fixture); sanity:
    expect(html).toContain('"edges"');
  });
});
```

> **Dependency:** this test reads the real template at `dist/web/index.html`, so the web build (Task 11) must have run. The test command below builds the web bundle first.

- [ ] **Step 8: Build web template, then run the integration test**

Run: `npm run build:web && npx vitest run tests/cli.integration.test.ts`
Expected: PASS — output path is `<dest>.html`, placeholder gone, fixture class names present.

- [ ] **Step 9: Build the CLI and smoke-test the binary end to end**

Run:
```bash
npm run build:cli
node dist/cli/bin.js graph tests/fixtures/trace.txt /tmp/clg-smoke
test -f /tmp/clg-smoke.html && echo "OK: emitted /tmp/clg-smoke.html"
```
Expected: prints `Wrote /tmp/clg-smoke.html` then `OK: emitted /tmp/clg-smoke.html`.

- [ ] **Step 10: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/cli/runJava.ts src/cli/open.ts src/cli/run.ts src/cli/bin.ts tsup.config.ts tests/fixtures/trace.txt tests/cli.integration.test.ts
git commit -m "feat(cli): runJava, browser open, orchestration, bin + integration test"
```

---

## Task 16: Remove Python, rewrite docs, add Node CI

**Files:**
- Delete: `classloadgrapher/`, `build/`, `ClassloadGrapher.egg-info/`, `setup.py`, `setup.cfg`, `pyproject.toml`, `requirements.txt`, `test-requirements.txt`, `conftest.py`, `.coveragerc`, `tests/test_parse.py`, `tests/test_skeleton.py`, `tests/conftest.py`, `tests/travis_install.sh`, `.travis.yml`, `docs/src/` (Sphinx), `docs/html/`
- Delete: `.github/workflows/python-app.yml`, `.github/workflows/th0.1.yml`, `.github/workflows/thactionscan.yml`
- Create: `README.md`, `.github/workflows/ci.yml`
- Delete: `README.rst`, `CHANGES.rst` (or convert — see step)
- Modify: `.pre-commit-config.yaml`

- [ ] **Step 1: Remove Python sources, packaging, and Sphinx docs**

```bash
git rm -r classloadgrapher build ClassloadGrapher.egg-info docs/src docs/html
git rm setup.py setup.cfg pyproject.toml requirements.txt test-requirements.txt conftest.py .coveragerc
git rm tests/test_parse.py tests/test_skeleton.py tests/conftest.py tests/travis_install.sh
git rm .travis.yml .github/workflows/python-app.yml .github/workflows/th0.1.yml .github/workflows/thactionscan.yml
```

Expected: all listed paths are staged for deletion. (If any path does not exist, drop it from the command — the directory listing in the spec was a snapshot.)

- [ ] **Step 2: Verify no Python references remain in build config**

Run: `grep -rIl --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs -e 'graphviz' -e 'classloadgrapher' . || echo "clean"`
Expected: prints `clean` (or only matches inside the new plan/spec docs, which is fine).

- [ ] **Step 3: Write `README.md`**

````markdown
# ClassLoadGrapher

Is your Java program's startup slow? Wondering what's filling your metaspace?
ClassLoadGrapher turns a JVM **class-resolution trace** into an **interactive
graph** of which classes resolve which other classes, rendered with
[React Flow](https://reactflow.dev) in a single self-contained HTML file.

Works with modern JDKs (Java 9 – 25+) which use unified logging (`-Xlog`), and
still understands the legacy `-XX:+TraceClassResolution` format from Java 8 and
earlier.

## Requirements

- Node.js >= 18
- A JDK (only for the `run` command, which launches your program)

## Install

```bash
npm install -g classloadgrapher
# or run without installing:
npx classloadgrapher ...
```

## Usage

### The easy way — let the tool run your program

```bash
clgrapher run ~/MyClasses --jar your-app.jar
clgrapher run ~/MyClasses --cp build com.example.Main
clgrapher run ~/MyClasses -- -jar your-app.jar --some-app-arg
```

This writes `~/MyClasses.html`. Open it in any browser — no server needed.

### From an existing trace

JDK 9+ (including 25):

```bash
java -Xlog:class+resolve=debug:file=MyClassTrace.txt -jar your-app.jar
clgrapher graph MyClassTrace.txt ~/MyClasses
```

JDK 8 and earlier:

```bash
java -XX:+TraceClassResolution -jar your-app.jar > MyClassTrace.txt
clgrapher graph MyClassTrace.txt ~/MyClasses
```

## Options

- `-abrv` — start with package names abbreviated (`java.lang.` → `j.l.`)
- `-f STR` — start with classes whose name contains `STR` hidden
- `--view` — open the generated HTML in your browser when done

All three are also live controls inside the generated page.

## The interactive graph

- Classes are grouped by **package** by default; click **+** on a package to
  expand it into its classes.
- **Filter**, **search**, and **abbreviate** are live in the left panel.
- Click a node to highlight everything it resolves (and what resolves it).
- Pan, zoom, drag, and use the minimap for large graphs.

## Development

```bash
npm install
npm test          # vitest
npm run typecheck
npm run lint
npm run build     # web template (Vite singlefile) + CLI (tsup)
npm run dev       # vite dev server with a sample graph
```
````

- [ ] **Step 4: Add a `dev` script to `package.json`**

Modify the `scripts` block in `package.json` to add:

```json
    "dev": "vite",
```

(Insert after the `"build"` line. Vite uses `root: src/web`, so `npm run dev` serves the app with the dev fixture.)

- [ ] **Step 5: Convert `CHANGES.rst` and remove `README.rst`**

```bash
git rm README.rst
```

Create `CHANGELOG.md` with a migration entry, then remove the old rST changelog:

```markdown
# Changelog

## 2.0.0

- Rewritten in TypeScript; the CLI now emits a single self-contained
  interactive HTML file (React Flow) instead of a Graphviz PDF.
- New interactive UI: package-aggregated default view with expand/collapse,
  live filter, search, abbreviation toggle, and click-to-highlight.
- Graph now keeps every distinct resolution edge (previously collapsed to a tree).
- Graphviz `dot` is no longer required.
```

```bash
git rm CHANGES.rst
```

- [ ] **Step 6: Update `.pre-commit-config.yaml` for a TS project**

Replace the file contents with hooks that fit the new stack:

```yaml
repos:
  - repo: local
    hooks:
      - id: prettier
        name: prettier
        entry: npx prettier --write
        language: system
        types_or: [ts, tsx, javascript, json, css, markdown]
      - id: eslint
        name: eslint
        entry: npx eslint
        language: system
        types_or: [ts, tsx]
        pass_filenames: false
        args: ['.']
      - id: vitest
        name: vitest
        entry: npm test
        language: system
        pass_filenames: false
```

- [ ] **Step 7: Add Node CI workflow `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build:web
      - run: npm test
      - run: npm run build:cli
```

- [ ] **Step 8: Verify the project is green end to end**

Run: `npm ci && npm run typecheck && npm run lint && npm run build && npm test`
Expected: every step exits 0; `dist/web/index.html` and `dist/cli/bin.js` exist.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: remove Python tool, add Markdown docs and Node CI"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- CLI → self-contained HTML (Approach 1) → Tasks 11, 13, 15. ✓
- Three layers (core/cli/web) → Tasks 2–4 (core), 12–15 (cli), 5–11 (web). ✓
- `graph` + `run` subcommands, back-compat shim, `-abrv`/`-f`/`--view` → Task 14. ✓
- Rich interactive UI (filter, abbreviate, search, expand/collapse, highlight) → Tasks 5, 7, 8, 9, 10. ✓
- Package-aggregated default + expansion → Task 5. ✓
- Full-graph semantics (dedup exact, skip arrays, keep distinct) → Task 3. ✓
- Abbreviation per documented behavior → Task 4 (deviation from Python quirk flagged). ✓
- dagre layout → Task 6. ✓
- runJava xlog flag, temp-file handling, ENOENT, nonzero-exit warning → Tasks 12, 15. ✓
- Empty-state handling (no resolve lines) → Task 10. ✓
- Tests: ported 3 parse cases + buildGraph + abbreviate + web transforms + CLI integration → Tasks 2–8, 15. ✓
- Remove Python, README.md, drop Sphinx, Node CI, ESLint+Prettier → Tasks 1, 16. ✓

**Placeholder scan:** No `TBD`/`TODO`/"add error handling" placeholders; every code step has complete code.

**Type consistency:** `Edge`/`GraphModel`/`EmbeddedData`/`EmbeddedOpts` (core/types.ts) are used consistently in core, cli, and web. `ViewNode`/`ViewEdge`/`ViewGraph`/`ViewState` (web/graph/types.ts) flow through `buildVisibleGraph` → `toReactFlow`. `ClgNodeData` defined in toReactFlow.ts and consumed by both node components. `ParsedArgs` defined in parseArgs.ts and consumed by run.ts. `JavaRunOptions`/`buildJavaArgs` shared by runJava.ts. Node type keys `clgPackage`/`clgClass` match between `toReactFlow` and the `nodeTypes` map in App.tsx.

**One known verification point** (flagged inline in Task 14): commander's storage key for the single-dash `-abrv` flag should be confirmed against the installed commander version; the action reads both casings and the test will catch a mismatch.
