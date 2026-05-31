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
