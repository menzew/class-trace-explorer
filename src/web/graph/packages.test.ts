import { describe, expect, it } from 'vitest';
import { namespacePrefixes, outerClassOf, parentNamespace, visibleUnitId } from './packages';

describe('namespace packages', () => {
  it('builds prefixes from broadest to deepest', () => {
    expect(namespacePrefixes('org.eclipse.core')).toEqual([
      'org',
      'org.eclipse',
      'org.eclipse.core',
    ]);
  });

  it('maps a class to the deepest visible namespace', () => {
    const fqcn = 'org.eclipse.core.Main';
    expect(visibleUnitId(fqcn, new Set())).toBe('pkg:org');
    expect(visibleUnitId(fqcn, new Set(['org']))).toBe('pkg:org.eclipse');
    expect(visibleUnitId(fqcn, new Set(['org', 'org.eclipse']))).toBe('pkg:org.eclipse.core');
    expect(visibleUnitId(fqcn, new Set(['org', 'org.eclipse', 'org.eclipse.core']))).toBe(fqcn);
  });

  it('finds the namespace level that can collapse a visible child', () => {
    expect(parentNamespace('org.eclipse.core')).toBe('org.eclipse');
    expect(parentNamespace('org')).toBeNull();
  });

  it('maps nested and hidden classes to their stable outer type', () => {
    expect(outerClassOf('app.Outer$Inner')).toBe('app.Outer');
    expect(outerClassOf('app.Outer$$Lambda/0x123')).toBe('app.Outer');
    expect(outerClassOf('app.Outer')).toBe('app.Outer');
  });
});
