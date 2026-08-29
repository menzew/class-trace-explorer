# Contributing

Contributions are welcome through GitHub issues and pull requests.

## Development setup

```bash
npm ci
npm run check
```

Use Node.js 20 or newer. A JDK is required only for capture and end-to-end
examples.

## Project conventions

- Keep parsing and graph construction independent from React.
- Preserve exact JVM class names in the model even when the UI presents a more
  readable label.
- Add focused tests for parser formats, aggregation semantics, and interactive
  state changes.
- Do not commit third-party application JARs, temporary traces, `dist`, or
  generated reports.
- Keep reports self-contained and functional when opened from disk.

## Before opening a pull request

```bash
npm run check
npm pack --dry-run
```

Explain behavior changes and include a small trace fixture when parser or graph
semantics change. Screenshots help with layout changes, but tests should cover
the underlying projection or state transition.

## Reporting bugs

Include the JDK version, capture command, relevant CLI options, and the smallest
trace that reproduces the issue. Remove proprietary names or paths before
sharing a trace publicly.
