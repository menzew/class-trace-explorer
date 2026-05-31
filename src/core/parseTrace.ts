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
