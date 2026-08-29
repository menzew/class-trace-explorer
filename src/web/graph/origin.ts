import type { NodeOrigin } from './types';

const LABELS: Record<NodeOrigin, string> = {
  system: 'SYSTEM',
  application: 'APP',
  dependency: 'DEPENDENCY',
  unknown: 'UNKNOWN',
  mixed: 'MIXED',
};

const COLORS: Record<NodeOrigin, { color: string; background: string }> = {
  system: { color: '#075985', background: '#e0f2fe' },
  application: { color: '#166534', background: '#dcfce7' },
  dependency: { color: '#6b21a8', background: '#f3e8ff' },
  unknown: { color: '#475569', background: '#e2e8f0' },
  mixed: { color: '#9a3412', background: '#ffedd5' },
};

export function originLabel(origin: NodeOrigin): string {
  return LABELS[origin];
}

export function originColors(origin: NodeOrigin): { color: string; background: string } {
  return COLORS[origin];
}
