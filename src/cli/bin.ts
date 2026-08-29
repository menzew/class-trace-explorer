#!/usr/bin/env node
import { isNormalCliExit, parseArgs } from './parseArgs';
import { run } from './run';

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const outPath = await run(args);
    process.stdout.write(`Wrote ${outPath}\n`);
  } catch (err) {
    if (isNormalCliExit(err)) return;
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}

void main();
