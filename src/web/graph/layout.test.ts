import { describe, it, expect } from 'vitest';
import { chooseLayoutStrategy, dagreLayout, fastGridLayout } from './layout';

describe('dagreLayout', () => {
  it('assigns a numeric position to every node', () => {
    const positioned = dagreLayout(
      [
        { id: 'a', width: 120, height: 36 },
        { id: 'b', width: 120, height: 36 },
      ],
      [{ id: 'a->b', source: 'a', target: 'b' }],
    );
    const byId = Object.fromEntries(positioned.map((n) => [n.id, n.position]));
    expect(typeof byId.a.x).toBe('number');
    expect(typeof byId.a.y).toBe('number');
    expect(typeof byId.b.x).toBe('number');
  });

  it('places a target below its source for top-to-bottom layout', () => {
    const positioned = dagreLayout(
      [
        { id: 'a', width: 120, height: 36 },
        { id: 'b', width: 120, height: 36 },
      ],
      [{ id: 'a->b', source: 'a', target: 'b' }],
    );
    const a = positioned.find((n) => n.id === 'a')!;
    const b = positioned.find((n) => n.id === 'b')!;
    expect(b.position.y).toBeGreaterThan(a.position.y);
  });
});

describe('chooseLayoutStrategy', () => {
  it('keeps dagre for small graphs', () => {
    expect(
      chooseLayoutStrategy(
        [
          { id: 'a', width: 120, height: 36 },
          { id: 'b', width: 120, height: 36 },
        ],
        [{ id: 'a->b', source: 'a', target: 'b' }],
      ),
    ).toBe('dagre');
  });

  it('switches away from dagre for the dense package graph size that freezes browsers', () => {
    const nodes = Array.from({ length: 196 }, (_, i) => ({
      id: `pkg:${i}`,
      width: 120,
      height: 40,
    }));
    const edges = Array.from({ length: 1502 }, (_, i) => ({
      id: `e:${i}`,
      source: `pkg:${i % nodes.length}`,
      target: `pkg:${(i + 1) % nodes.length}`,
    }));

    expect(chooseLayoutStrategy(nodes, edges)).toBe('grid');
  });
});

describe('fastGridLayout', () => {
  it('assigns deterministic grid positions without looking at edges', () => {
    const positioned = fastGridLayout([
      { id: 'a', width: 120, height: 40 },
      { id: 'b', width: 120, height: 40 },
      { id: 'c', width: 120, height: 40 },
      { id: 'd', width: 120, height: 40 },
    ]);

    expect(positioned.map((n) => n.position)).toEqual([
      { x: 0, y: 0 },
      { x: 240, y: 0 },
      { x: 0, y: 140 },
      { x: 240, y: 140 },
    ]);
  });
});
