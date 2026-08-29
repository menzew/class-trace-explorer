import { describe, expect, it } from 'vitest';
import { buildClassInfo, classifyOrigin } from './classOrigin';

describe('classifyOrigin', () => {
  it('recognizes system classes from namespaces and runtime sources', () => {
    expect(classifyOrigin({ name: 'java.lang.String' })).toBe('system');
    expect(classifyOrigin({ name: 'vm.Generated', source: 'shared objects file' })).toBe('system');
  });

  it('recognizes application classes using source and package hints', () => {
    expect(
      classifyOrigin(
        { name: 'app.Main', source: 'file:/work/build/classes/' },
        { appSources: ['/work/build/classes'] },
      ),
    ).toBe('application');
    expect(classifyOrigin({ name: 'com.example.Main' }, { appPrefixes: ['com.example'] })).toBe(
      'application',
    );
  });

  it('treats other jars as dependencies and ambiguous directories as unknown', () => {
    expect(classifyOrigin({ name: 'org.lib.Type', source: 'file:/deps/lib.jar' })).toBe(
      'dependency',
    );
    expect(classifyOrigin({ name: 'app.Main', source: 'file:/work/classes/' })).toBe('unknown');
  });
});

describe('buildClassInfo', () => {
  it('creates information for resolved classes without load records', () => {
    expect(buildClassInfo(['java.lang.String', 'app.Main'], [])).toEqual({
      'java.lang.String': { name: 'java.lang.String', origin: 'system' },
      'app.Main': { name: 'app.Main', origin: 'unknown' },
    });
  });
});
