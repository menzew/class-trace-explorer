import { describe, it, expect } from 'vitest';
import { abbreviate } from './abbreviate';

describe('abbreviate', () => {
  it('shortens package segments and keeps the simple class name', () => {
    expect(abbreviate('java.lang.String')).toBe('j.l.String');
    expect(abbreviate('com.example.foo.Bar')).toBe('c.e.f.Bar');
  });

  it('returns names with no package unchanged', () => {
    expect(abbreviate('Main')).toBe('Main');
  });
});
