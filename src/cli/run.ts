import { readFile } from 'node:fs/promises';
import { delimiter } from 'node:path';
import { parseClassLoads, parseTrace } from '../core/parseTrace';
import { buildGraph } from '../core/buildGraph';
import type { EmbeddedData } from '../core/types';
import { emitHtml } from './emitHtml';
import { runJava, cleanupTrace } from './runJava';
import { openInBrowser } from './open';
import type { ParsedArgs } from './parseArgs';
import { measureClassFiles } from './measureClassFiles';

function inferredAppSources(args: ParsedArgs): string[] {
  const sources = [...args.appSources];
  if (args.jar) sources.push(args.jar);
  if (args.classpath) {
    for (const entry of args.classpath.split(delimiter)) {
      if (entry && !entry.toLowerCase().endsWith('.jar')) sources.push(entry);
    }
  }
  const jarIndex = args.javaArgs.indexOf('-jar');
  if (jarIndex !== -1 && args.javaArgs[jarIndex + 1]) sources.push(args.javaArgs[jarIndex + 1]);
  return [...new Set(sources)];
}

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
    const graph = await measureClassFiles(
      buildGraph(parseTrace(text), parseClassLoads(text), {
        appSources: inferredAppSources(args),
        appPrefixes: args.appPrefixes,
      }),
    );
    const data: EmbeddedData = {
      graph,
      opts: { abbreviate: args.abbreviate, filter: args.filter },
    };
    const outPath = await emitHtml(args.dest, data);
    if (args.view) openInBrowser(outPath);
    return outPath;
  } finally {
    if (ephemeral) cleanupTrace(tracePath);
  }
}
