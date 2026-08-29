import type { ClassLoad, Edge } from './types';

const UPTIME_RE = /^\[(\d+(?:\.\d+)?)(s|ms|us|ns)\]/;
const SOURCE_RE = /^(.+):(\d+)$/;

function parseUptimeMs(line: string): number | undefined {
  const match = line.match(UPTIME_RE);
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return value * 1000;
  if (unit === 'ms') return value;
  if (unit === 'us') return value / 1000;
  return value / 1_000_000;
}

/** Parse a unified-log `class+load` line, retaining source and uptime. */
export function parseClassLoadLine(line: string): ClassLoad | null {
  const stripped = line.trim();
  if (!stripped.startsWith('[')) return null;
  const tagEnd = stripped.lastIndexOf(']');
  if (tagEnd === -1 || !stripped.slice(0, tagEnd + 1).includes('class,load')) return null;

  const message = stripped.slice(tagEnd + 1).trim();
  const sourceMarker = ' source: ';
  const sourceIndex = message.indexOf(sourceMarker);
  const name = (sourceIndex === -1 ? message : message.slice(0, sourceIndex)).trim();
  if (!name || name.includes(' ')) return null;

  const load: ClassLoad = { name };
  const timestampMs = parseUptimeMs(stripped);
  if (timestampMs !== undefined) load.timestampMs = timestampMs;
  if (sourceIndex !== -1) load.source = message.slice(sourceIndex + sourceMarker.length).trim();
  return load;
}

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

  const edge: Edge = { from: parts[0], to: parts[1] };
  const timestampMs = parseUptimeMs(stripped);
  if (timestampMs !== undefined) edge.timestampMs = timestampMs;

  const source = parts[2]?.match(SOURCE_RE);
  if (source) {
    edge.sourceFile = source[1];
    edge.sourceLine = Number(source[2]);
  }

  const detailStart = source ? 3 : 2;
  if (parts.length > detailStart) {
    edge.detail = parts
      .slice(detailStart)
      .join(' ')
      .replace(/^\(|\)$/g, '');
  }
  return edge;
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

/** Parse all class-load records in event order. */
export function parseClassLoads(text: string): ClassLoad[] {
  const loads: ClassLoad[] = [];
  for (const line of text.split('\n')) {
    const load = parseClassLoadLine(line);
    if (load) loads.push(load);
  }
  return loads;
}
