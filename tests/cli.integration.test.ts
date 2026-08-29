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
    expect(html).toContain('shared objects file');
    expect(html).toContain('"origin":"system"');
    // Array-target and noise lines must not appear as edges (none in fixture); sanity:
    expect(html).toContain('"edges"');
  });
});
