import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import yauzl from 'yauzl';
import type { ClassInfo, GraphModel } from '../core/types';

interface SourceGroup {
  path: string;
  classes: Array<[string, ClassInfo]>;
}

function classEntryName(fqcn: string): string | null {
  if (!fqcn || fqcn.includes('/') || fqcn.includes('[')) return null;
  return `${fqcn.replaceAll('.', '/')}.class`;
}

function localSourcePath(source: string | undefined): string | null {
  if (!source) return null;
  const fileUrl = source.startsWith('jar:file:')
    ? source.slice('jar:'.length).replace(/!\/$/, '')
    : source;
  if (!fileUrl.startsWith('file:')) return null;
  try {
    return fileURLToPath(fileUrl);
  } catch {
    return null;
  }
}

function readJarSizes(path: string, wanted: Set<string>): Promise<Map<string, number>> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) {
        reject(error ?? new Error(`Unable to open ${path}`));
        return;
      }
      const sizes = new Map<string, number>();
      zip.on('error', reject);
      zip.on('entry', (entry) => {
        if (wanted.has(entry.fileName)) sizes.set(entry.fileName, entry.uncompressedSize);
        zip.readEntry();
      });
      zip.on('end', () => resolve(sizes));
      zip.readEntry();
    });
  });
}

async function measureDirectory(group: SourceGroup): Promise<Map<string, number>> {
  const measured = new Map<string, number>();
  await Promise.all(
    group.classes.map(async ([fqcn]) => {
      const entry = classEntryName(fqcn);
      if (!entry) return;
      try {
        const info = await stat(join(group.path, entry));
        if (info.isFile()) measured.set(fqcn, info.size);
      } catch {
        // A trace source can be incomplete or unavailable on the report-generating host.
      }
    }),
  );
  return measured;
}

async function measureJar(group: SourceGroup): Promise<Map<string, number>> {
  const entries = new Map<string, string>();
  for (const [fqcn] of group.classes) {
    const entry = classEntryName(fqcn);
    if (entry) entries.set(entry, fqcn);
  }
  const sizes = await readJarSizes(group.path, new Set(entries.keys()));
  const measured = new Map<string, number>();
  for (const [entry, bytes] of sizes) {
    const fqcn = entries.get(entry);
    if (fqcn) measured.set(fqcn, bytes);
  }
  return measured;
}

/** Enrich classes whose reported `file:` source is an accessible directory or JAR. */
export async function measureClassFiles(graph: GraphModel): Promise<GraphModel> {
  if (!graph.classInfo) return graph;
  const classInfo = Object.fromEntries(
    Object.entries(graph.classInfo).map(([fqcn, info]) => [fqcn, { ...info }]),
  );
  const groups = new Map<string, SourceGroup>();

  for (const [fqcn, info] of Object.entries(classInfo)) {
    const path = localSourcePath(info.source);
    if (!path) continue;
    const group = groups.get(path) ?? { path, classes: [] };
    group.classes.push([fqcn, info]);
    groups.set(path, group);
  }

  await Promise.all(
    [...groups.values()].map(async (group) => {
      try {
        const source = await stat(group.path);
        const measured = source.isDirectory()
          ? await measureDirectory(group)
          : await measureJar(group);
        for (const [fqcn, bytes] of measured) {
          classInfo[fqcn].classFileBytes = bytes;
          classInfo[fqcn].sizeProvenance = 'class-file';
        }
      } catch {
        // Keep generation useful when an imported trace references unavailable artifacts.
      }
    }),
  );

  return { ...graph, classInfo };
}
