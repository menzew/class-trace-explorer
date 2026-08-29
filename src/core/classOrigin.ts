import type { ClassInfo, ClassLoad, ClassOrigin, OriginHints } from './types';

const SYSTEM_PREFIXES = [
  'java.',
  'javax.',
  'jdk.',
  'sun.',
  'com.sun.',
  'org.w3c.dom.',
  'org.xml.sax.',
];
const SYSTEM_SOURCES = ['shared objects file', 'jrt:/', 'bootstrap'];

function matchesPrefix(name: string, prefix: string): boolean {
  return name === prefix || name.startsWith(prefix.endsWith('.') ? prefix : `${prefix}.`);
}

export function classifyOrigin(load: ClassLoad, hints: OriginHints = {}): ClassOrigin {
  const source = load.source?.toLowerCase();
  if (
    SYSTEM_PREFIXES.some((prefix) => load.name.startsWith(prefix)) ||
    (source && SYSTEM_SOURCES.some((marker) => source.includes(marker)))
  ) {
    return 'system';
  }
  if (hints.appPrefixes?.some((prefix) => matchesPrefix(load.name, prefix))) {
    return 'application';
  }
  if (
    source &&
    hints.appSources?.some((candidate) =>
      source.includes(candidate.toLowerCase().replace(/\\/g, '/')),
    )
  ) {
    return 'application';
  }
  if (source && (source.includes('.jar') || source.startsWith('jar:'))) return 'dependency';
  return 'unknown';
}

export function buildClassInfo(
  classes: Iterable<string>,
  loads: ClassLoad[],
  hints: OriginHints = {},
): Record<string, ClassInfo> {
  const firstLoads = new Map<string, ClassLoad>();
  for (const load of loads) if (!firstLoads.has(load.name)) firstLoads.set(load.name, load);

  const info: Record<string, ClassInfo> = {};
  for (const name of classes) {
    const load = firstLoads.get(name) ?? { name };
    info[name] = { ...load, origin: classifyOrigin(load, hints) };
  }
  return info;
}
