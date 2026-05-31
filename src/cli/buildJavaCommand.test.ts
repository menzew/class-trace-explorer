import { describe, it, expect } from 'vitest';
import { buildJavaArgs, xlogArg } from './buildJavaCommand';

describe('buildJavaArgs', () => {
  it('prepends the xlog flag and a -jar invocation', () => {
    const args = buildJavaArgs({ tracePath: '/t/trace.txt', jar: 'app.jar' });
    expect(args[0]).toBe(xlogArg('/t/trace.txt'));
    expect(args.slice(1)).toEqual(['-jar', 'app.jar']);
  });

  it('builds a -cp invocation with trailing main/args', () => {
    const args = buildJavaArgs({
      tracePath: '/t/trace.txt',
      classpath: 'build',
      rest: ['com.example.Main', '--flag'],
    });
    expect(args.slice(1)).toEqual(['-cp', 'build', 'com.example.Main', '--flag']);
  });

  it('passes raw args verbatim after the xlog flag', () => {
    const args = buildJavaArgs({ tracePath: '/t/trace.txt', rest: ['-jar', 'x.jar'] });
    expect(args.slice(1)).toEqual(['-jar', 'x.jar']);
  });

  it('throws when there is nothing to run', () => {
    expect(() => buildJavaArgs({ tracePath: '/t/trace.txt' })).toThrow(/nothing to run/i);
  });
});
