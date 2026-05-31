# Migration Handoff — for Codex (or next agent)

**Branch:** `migrate-to-typescript-reactflow`  •  **HEAD at handoff:** `b2dce26`
**Date:** 2026-05-31

## What you're finishing
Migrating ClassLoadGrapher from Python+Graphviz to TypeScript + React Flow. The
CLI parses a JVM class-resolution trace and emits a single self-contained
interactive HTML file (React Flow + dagre).

- **Spec:** `docs/superpowers/specs/2026-05-31-graphviz-to-reactflow-ts-migration-design.md`
- **Plan (contains COMPLETE code for every task):** `docs/superpowers/plans/2026-05-31-graphviz-to-reactflow-ts-migration.md`

Execute the plan task-by-task. Each task in the plan has the exact file contents,
test code, run commands, expected output, and commit message. You should rarely
need to invent anything — transcribe and verify.

## Done (Tasks 1–6, all committed, 17 tests passing, `tsc` clean)
1. Scaffold — `package.json`, `tsconfig.json`, vitest/eslint/prettier/tsup configs, `.gitignore` (`2d9692d`)
2. `src/core/types.ts` + `parseTrace.ts` (`21f4c8a`); plus a no-dedup contract test (`3a74425`)
3. `src/core/buildGraph.ts` (`5fd0867`)
4. `src/core/abbreviate.ts` (`5bd71ed`)
5. `src/web/graph/{types,packages,view}.ts` (`fc86b28`)
6. `src/web/graph/layout.ts` — dagre wrapper (`b2dce26`)

`@dagrejs/dagre` v1.1.8 ships its own types — no `@types` shim needed; the
existing imports typecheck.

## Remaining (start here)
- **Task 7** — `src/web/graph/toReactFlow.ts` (+ test): `nodeLabel`, `estimateSize`, `computeHighlight`, `toReactFlow`. NEXT.
- **Task 8** — `src/web/state.tsx` (+ test): view-state reducer + context.
- **Task 9** — `src/web/nodes/{PackageNode,ClassNode}.tsx`, `src/web/controls/{Panel,Legend}.tsx`.
- **Task 10** — `src/web/{App.tsx,main.tsx,devFixture.ts,index.html}` (+ `App.test.tsx` smoke test).
- **Task 11** — `vite.config.ts`; `npm run build:web` → `dist/web/index.html`; verify self-contained + placeholder present.
- **Task 12** — `src/cli/buildJavaCommand.ts` (+ test).
- **Task 13** — `src/cli/emitHtml.ts` (+ test).
- **Task 14** — `src/cli/parseArgs.ts` (+ test). ⚠️ Verify commander's storage key for the single-dash `-abrv` flag against the installed commander version; the action reads both casings and the test will catch a mismatch (see the note in the plan task).
- **Task 15** — `src/cli/{runJava,open,run,bin}.ts`, `tsup.config.ts`, `tests/fixtures/trace.txt`, integration test. Build web first.
- **Task 16** — Python teardown + `README.md` + drop Sphinx + Node CI. **DO NOT run without explicit human confirmation** (see below).

## ⚠️ CRITICAL — shared working tree (non-negotiable rules)
Another concurrent session (same git author) is doing a *different*, Python-based
migration of this **same checkout** and commits to this **same branch** (e.g.
commit `5cee708 "Fix graph behavior and test setup"` is interleaved in history).
You share one working tree and one git index with it. Therefore:

1. **Commit only your task's files, with explicit pathspecs:**
   `git add <file1> <file2> && git commit --no-verify -- <file1> <file2>`
2. **NEVER** `git add -A`, `git add .`, `git add -u`, or `git commit -a` — these
   sweep the other session's edits into your commit. (That already happened once
   and had to be reverted.)
3. `git status`/`git diff` will show unrelated modified/deleted files
   (`classloadgrapher/*.py`, `docs/...`, workflows). **Ignore them. Never stage,
   revert, restore, or delete them.**
4. After each task run the continuous gate: `npx vitest run` and `npx tsc --noEmit`.
   (Vitest only runs TS tests; it ignores the Python files, so the gate is stable.)
5. **Task 16 is the only real conflict** — it deletes the very Python files the
   other session is editing. **Pause and get the human's explicit OK before
   running Task 16**, or you'll clobber the other session's in-flight work.

## How to resume with Codex
From the repo root, e.g.:

```
codex "Continue the ClassLoadGrapher TS migration. Read docs/superpowers/HANDOFF.md
and docs/superpowers/plans/2026-05-31-graphviz-to-reactflow-ts-migration.md, then
implement Task 7 onward exactly as specified, one task at a time. After each task
run 'npx vitest run' and 'npx tsc --noEmit'. Commit ONLY each task's own files with
'git commit --no-verify -- <files>' (never 'git add -A'). STOP and ask before Task 16."
```

State at handoff: 17 tests passing, `tsc` clean, HEAD `b2dce26`.
