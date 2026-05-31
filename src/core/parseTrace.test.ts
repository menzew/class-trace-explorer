import { describe, it, expect } from 'vitest';
import { parseResolveLine, parseTrace } from './parseTrace';

describe('parseResolveLine', () => {
  it('parses unified-logging (JDK 9+) lines', () => {
    const line =
      '[0.012s][debug][class,resolve] java.lang.String java.io.ObjectStreamField String.java:242';
    expect(parseResolveLine(line)).toEqual({
      from: 'java.lang.String',
      to: 'java.io.ObjectStreamField',
    });
  });

  it('parses legacy RESOLVE lines', () => {
    const line = 'RESOLVE java.lang.Object java.lang.System Hello.java:1';
    expect(parseResolveLine(line)).toEqual({ from: 'java.lang.Object', to: 'java.lang.System' });
  });

  it('ignores blank and non-resolve lines', () => {
    expect(parseResolveLine('')).toBeNull();
    expect(parseResolveLine('[0.006s][info][class,load] java.lang.Object source: shared')).toBeNull();
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
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ]);
  });

  it('does NOT deduplicate identical resolve lines (dedup is buildGraph\'s job)', () => {
    const text = ['RESOLVE A B x.java:1', 'RESOLVE A B x.java:1'].join('\n');
    expect(parseTrace(text)).toEqual([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'B' },
    ]);
  });
});
