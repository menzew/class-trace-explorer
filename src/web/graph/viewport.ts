import type { Node, Viewport } from '@xyflow/react';

function dimension(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

/** Compute a deterministic viewport before React Flow measures custom nodes. */
export function viewportForNodes(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 24,
): Viewport | null {
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(
    ...nodes.map((node) => node.position.x + dimension(node.style?.width, 220)),
  );
  const maxY = Math.max(
    ...nodes.map((node) => node.position.y + dimension(node.style?.height, 88)),
  );
  const graphWidth = Math.max(1, maxX - minX);
  const graphHeight = Math.max(1, maxY - minY);
  const zoom = Math.max(
    0.05,
    Math.min(
      1.25,
      (viewportWidth - padding * 2) / graphWidth,
      (viewportHeight - padding * 2) / graphHeight,
    ),
  );

  return {
    x: (viewportWidth - graphWidth * zoom) / 2 - minX * zoom,
    y: (viewportHeight - graphHeight * zoom) / 2 - minY * zoom,
    zoom,
  };
}
