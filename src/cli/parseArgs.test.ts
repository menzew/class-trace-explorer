import { describe, it, expect } from 'vitest';
import { normalizeArgv, parseArgs } from './parseArgs';

describe('normalizeArgv (back-compat shim)', () => {
  it('prepends "graph" when the first token is not a known command/flag', () => {
    expect(normalizeArgv(['trace.txt', 'out'])).toEqual(['graph', 'trace.txt', 'out']);
  });

  it('leaves explicit subcommands untouched', () => {
    expect(normalizeArgv(['graph', 't', 'o'])).toEqual(['graph', 't', 'o']);
    expect(normalizeArgv(['run', 'out', '--jar', 'a.jar'])).toEqual(['run', 'out', '--jar', 'a.jar']);
  });

  it('leaves global flags untouched', () => {
    expect(normalizeArgv(['--version'])).toEqual(['--version']);
  });
});

describe('parseArgs', () => {
  it('parses the graph subcommand with common options', () => {
    const r = parseArgs(['graph', 'trace.txt', 'out', '-abrv', '-f', 'sun']);
    expect(r).toMatchObject({
      command: 'graph',
      raw: 'trace.txt',
      dest: 'out',
      abbreviate: true,
      filter: 'sun',
    });
  });

  it('parses the run subcommand and collects java args after --', () => {
    const r = parseArgs(['run', 'out', '--cp', 'build', '--', 'com.example.Main', '--flag']);
    expect(r).toMatchObject({ command: 'run', dest: 'out', classpath: 'build' });
    expect(r.javaArgs).toEqual(['com.example.Main', '--flag']);
  });
});
