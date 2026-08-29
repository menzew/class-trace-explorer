import { describe, it, expect } from 'vitest';
import { CommanderError } from 'commander';
import { isNormalCliExit, normalizeArgv, parseArgs } from './parseArgs';

describe('normalizeArgv (back-compat shim)', () => {
  it('prepends "graph" when the first token is not a known command/flag', () => {
    expect(normalizeArgv(['trace.txt', 'out'])).toEqual(['graph', 'trace.txt', 'out']);
  });

  it('leaves explicit subcommands untouched', () => {
    expect(normalizeArgv(['graph', 't', 'o'])).toEqual(['graph', 't', 'o']);
    expect(normalizeArgv(['run', 'out', '--jar', 'a.jar'])).toEqual([
      'run',
      'out',
      '--jar',
      'a.jar',
    ]);
  });

  it('leaves global flags untouched', () => {
    expect(normalizeArgv(['--version'])).toEqual(['--version']);
  });
});

describe('parseArgs', () => {
  it('distinguishes normal Commander exits from command errors', () => {
    expect(isNormalCliExit(new CommanderError(0, 'commander.version', ''))).toBe(true);
    expect(isNormalCliExit(new CommanderError(1, 'commander.missingArgument', ''))).toBe(false);
    expect(isNormalCliExit(new Error('failure'))).toBe(false);
  });

  it('parses the graph subcommand with common options', () => {
    const r = parseArgs([
      'graph',
      'trace.txt',
      'out',
      '-abrv',
      '-f',
      'sun',
      '--app-source',
      'build/classes',
      '--app-prefix',
      'com.example',
      '--app-prefix',
      'org.internal',
    ]);
    expect(r).toMatchObject({
      command: 'graph',
      raw: 'trace.txt',
      dest: 'out',
      abbreviate: true,
      filter: 'sun',
      appSources: ['build/classes'],
      appPrefixes: ['com.example', 'org.internal'],
    });
  });

  it('parses the run subcommand and collects java args after --', () => {
    const r = parseArgs(['run', 'out', '--cp', 'build', '--', 'com.example.Main', '--flag']);
    expect(r).toMatchObject({ command: 'run', dest: 'out', classpath: 'build' });
    expect(r.javaArgs).toEqual(['com.example.Main', '--flag']);
    expect(r.appSources).toEqual([]);
  });
});
