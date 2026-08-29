import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateProvider } from '../state';
import type { ViewNode } from '../graph/types';
import { DetailsPanel } from './DetailsPanel';

const node: ViewNode = {
  id: 'app.Main',
  kind: 'class',
  package: 'app',
  fqcn: 'app.Main',
  origin: 'application',
  incomingCount: 0,
  outgoingCount: 4,
  internalEdgeCount: 1,
  crossPackageEdgeCount: 3,
  firstSeenMs: 12,
  roles: ['entry', 'bridge'],
  sourceLocations: [{ file: 'Main.java', line: 9 }],
  annotations: ['verification'],
  loadSources: ['file:/work/classes/'],
  loadedAtMs: 4,
  classFileBytes: 1536,
  measuredClassCount: 1,
};

describe('DetailsPanel', () => {
  it('shows selected-node topology and trace context', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <DetailsPanel node={node} />
      </StateProvider>,
    );

    expect(screen.getByRole('heading', { name: 'app.Main' })).toBeInTheDocument();
    expect(screen.getByText('12.0 ms')).toBeInTheDocument();
    expect(screen.getByText('Main.java:9')).toBeInTheDocument();
    expect(screen.getByText('verification')).toBeInTheDocument();
    expect(screen.getByText('file:/work/classes/')).toBeInTheDocument();
    expect(screen.getByText(/class · APP/)).toBeInTheDocument();
    expect(screen.getByText('1.5 KB')).toBeInTheDocument();
  });

  it('separates inner-class members without expanding the graph', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <DetailsPanel
          node={{
            ...node,
            id: 'type:org.netbeans.MainImpl',
            kind: 'type',
            package: 'org.netbeans',
            fqcn: 'org.netbeans.MainImpl',
            classCount: 3,
            measuredClassCount: 1,
            members: [
              'org.netbeans.MainImpl',
              'org.netbeans.MainImpl$1',
              'org.netbeans.MainImpl$BootClassLoader',
            ],
          }}
        />
      </StateProvider>,
    );
    expect(screen.getByText('MainImpl anonymous #1')).toBeInTheDocument();
    expect(screen.getByText('MainImpl.BootClassLoader')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show members as nodes' })).toBeInTheDocument();
    expect(screen.getByText('1 / 3 classes')).toBeInTheDocument();
  });
});
