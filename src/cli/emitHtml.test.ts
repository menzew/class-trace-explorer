import { describe, it, expect } from 'vitest';
import { injectData } from './emitHtml';
import type { EmbeddedData } from '../core/types';

const data: EmbeddedData = {
  graph: { classes: ['a.A'], edges: [{ from: 'a.A', to: 'a.A' }] },
  opts: { abbreviate: true, filter: null },
};

const template =
  '<script id="clg-data" type="application/json">__CLG_DATA_PLACEHOLDER__</script>';

describe('injectData', () => {
  it('replaces the placeholder with JSON and round-trips', () => {
    const html = injectData(template, data);
    expect(html).not.toContain('__CLG_DATA_PLACEHOLDER__');
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('<'));
    expect(JSON.parse(json)).toEqual(data);
  });

  it('escapes < to avoid breaking out of the script tag', () => {
    const tricky: EmbeddedData = {
      graph: { classes: ['</script>'], edges: [] },
      opts: { abbreviate: false, filter: null },
    };
    const html = injectData(template, tricky);
    expect(html).not.toContain('</script><');
    expect(html).toContain('\\u003c');
  });

  it('throws if the placeholder is missing', () => {
    expect(() => injectData('<html></html>', data)).toThrow(/placeholder/i);
  });
});
