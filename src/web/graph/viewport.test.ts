import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { viewportForNodes } from './viewport';

describe('viewportForNodes', () => {
  it('fits explicit node bounds inside a narrow viewport', () => {
    const nodes: Node[] = [
      { id: 'left', data: {}, position: { x: 0, y: 0 }, style: { width: 240, height: 88 } },
      { id: 'right', data: {}, position: { x: 360, y: 0 }, style: { width: 240, height: 88 } },
    ];
    const viewport = viewportForNodes(nodes, 390, 844, 24);
    expect(viewport).not.toBeNull();
    expect(viewport?.zoom).toBeCloseTo(0.57, 2);
    expect(viewport?.x).toBeCloseTo(24, 0);
  });

  it('returns null for an empty graph', () => {
    expect(viewportForNodes([], 390, 844)).toBeNull();
  });
});
