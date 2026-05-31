import { describe, it, expect } from 'vitest';
import { dagreLayout } from './layout';

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
