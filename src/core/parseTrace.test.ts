import { describe, it, expect } from 'vitest';
import { parseClassLoadLine, parseClassLoads, parseResolveLine, parseTrace } from './parseTrace';

describe('parseClassLoadLine', () => {
  it('parses class name, source, and uptime', () => {
    expect(
      parseClassLoadLine('[0.004s][info][class,load] app.Main source: file:/work/build/classes/'),
    ).toEqual({
      name: 'app.Main',
      source: 'file:/work/build/classes/',
      timestampMs: 4,
    });
  });

  it('preserves shared-object sources containing spaces', () => {
    expect(
      parseClassLoadLine('[0.001s][info][class,load] java.lang.Object source: shared objects file'),
    ).toMatchObject({ name: 'java.lang.Object', source: 'shared objects file' });
  });

  it('ignores resolve and unrelated lines', () => {
    expect(parseClassLoadLine('[0.1s][debug][class,resolve] a.A b.B')).toBeNull();
    expect(parseClassLoadLine('random')).toBeNull();
  });
});

describe('parseResolveLine', () => {
  it('parses unified-logging (JDK 9+) lines', () => {
    const line =
      '[0.012s][debug][class,resolve] java.lang.String java.io.ObjectStreamField String.java:242';
    expect(parseResolveLine(line)).toEqual({
      from: 'java.lang.String',
      to: 'java.io.ObjectStreamField',
      timestampMs: 12,
      sourceFile: 'String.java',
      sourceLine: 242,
    });
  });

  it('parses legacy RESOLVE lines', () => {
    const line = 'RESOLVE java.lang.Object java.lang.System Hello.java:1';
    expect(parseResolveLine(line)).toEqual({
      from: 'java.lang.Object',
      to: 'java.lang.System',
      sourceFile: 'Hello.java',
      sourceLine: 1,
    });
  });

  it('preserves resolution annotations without a source location', () => {
    expect(parseResolveLine('[12ms][debug][class,resolve] a.A b.B (verification)')).toEqual({
      from: 'a.A',
      to: 'b.B',
      timestampMs: 12,
      detail: 'verification',
    });
  });

  it('ignores blank and non-resolve lines', () => {
    expect(parseResolveLine('')).toBeNull();
    expect(
      parseResolveLine('[0.006s][info][class,load] java.lang.Object source: shared'),
    ).toBeNull();
    expect(parseResolveLine('random text')).toBeNull();
  });

  it('returns null when fewer than two tokens follow the tag', () => {
    expect(parseResolveLine('[0.1s][debug][class,resolve] OnlyOne')).toBeNull();
  });
});

describe('parseTrace', () => {
  it('collects every resolve edge in order, dropping noise', () => {
    const text = [
      '[0.001s][info][class,load] java.lang.Object source: shared',
      'RESOLVE A B x.java:1',
      '',
      '[0.012s][debug][class,resolve] C D D.java:2',
    ].join('\n');
    expect(parseTrace(text)).toEqual([
      { from: 'A', to: 'B', sourceFile: 'x.java', sourceLine: 1 },
      { from: 'C', to: 'D', timestampMs: 12, sourceFile: 'D.java', sourceLine: 2 },
    ]);
  });

  it("does NOT deduplicate identical resolve lines (dedup is buildGraph's job)", () => {
    const text = ['RESOLVE A B x.java:1', 'RESOLVE A B x.java:1'].join('\n');
    expect(parseTrace(text)).toEqual([
      { from: 'A', to: 'B', sourceFile: 'x.java', sourceLine: 1 },
      { from: 'A', to: 'B', sourceFile: 'x.java', sourceLine: 1 },
    ]);
  });
});

describe('parseClassLoads', () => {
  it('collects only class-load records', () => {
    const text = [
      '[0.001s][info][class,load] app.Main source: file:/app/classes/',
      '[0.002s][debug][class,resolve] app.Main java.lang.String Main.java:1',
    ].join('\n');
    expect(parseClassLoads(text)).toEqual([
      { name: 'app.Main', source: 'file:/app/classes/', timestampMs: 1 },
    ]);
  });
});
