import { beforeAll, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App, resolveSearchId } from './App';
import { buildVisibleGraph } from './graph/view';
import type { ViewState } from './graph/types';
import { StateProvider } from './state';
import type { GraphModel } from '../core/types';

const model: GraphModel = {
  classes: ['a.Foo', 'b.Bar'],
  edges: [{ from: 'a.Foo', to: 'b.Bar' }],
};

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('App', () => {
  it('renders package nodes from the model', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={model} />
      </StateProvider>,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getAllByText('1 class')).toHaveLength(2);
  });

  it('shows an empty state when there are no edges', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={{ classes: [], edges: [] }} />
      </StateProvider>,
    );
    expect(screen.getByText('No class resolutions found')).toBeInTheDocument();
  });

  it('finds a hidden class through its currently visible namespace', () => {
    const nested: GraphModel = {
      classes: ['org.eclipse.core.Main', 'com.example.Other'],
      edges: [{ from: 'org.eclipse.core.Main', to: 'com.example.Other' }],
    };
    const state: ViewState = {
      filter: null,
      visibleOrigins: new Set(['application', 'system', 'dependency', 'unknown']),
      abbreviate: false,
      search: '',
      expandedPackages: new Set(),
      expandedTypes: new Set(),
      selectedNodeId: null,
    };
    const view = buildVisibleGraph(nested, state);
    expect(resolveSearchId(nested, view, state.expandedPackages, 'CORE.main', null)).toBe(
      'pkg:org',
    );
  });

  it('reports exclusions and reveals a selected class result', async () => {
    const nested: GraphModel = {
      classes: ['org.eclipse.core.Main', 'com.example.Other'],
      edges: [{ from: 'org.eclipse.core.Main', to: 'com.example.Other' }],
    };
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={nested} />
      </StateProvider>,
    );

    fireEvent.change(screen.getByLabelText('Exclude by name'), { target: { value: 'other' } });
    expect(screen.getByText('1 class excluded')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('com')).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Find class or namespace'), {
      target: { value: 'core.main' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Class org.eclipse.core.Main' }));
    expect(await screen.findByText('Main')).toBeInTheDocument();
    const collapse = document.querySelector<HTMLButtonElement>(
      '[aria-label="Collapse package org.eclipse.core"]',
    );
    expect(collapse).not.toBeNull();
    fireEvent.click(collapse!);
    expect(await screen.findByText('org.eclipse.core')).toBeInTheDocument();
    expect(screen.queryByText('Main')).not.toBeInTheDocument();
  });

  it('stages origin checkboxes until their selection is applied', async () => {
    const originModel: GraphModel = {
      classes: ['app.Main', 'java.lang.String'],
      edges: [{ from: 'app.Main', to: 'java.lang.String' }],
      classInfo: {
        'app.Main': { name: 'app.Main', origin: 'application' },
        'java.lang.String': { name: 'java.lang.String', origin: 'system' },
      },
    };
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={originModel} />
      </StateProvider>,
    );
    expect(screen.getByText('java')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('SYSTEM'));
    expect(screen.getByText('java')).toBeInTheDocument();
    const apply = screen.getByRole('button', { name: 'Apply origin filters' });
    expect(apply).toBeEnabled();
    fireEvent.click(apply);
    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(apply).toBeDisabled();
    await waitFor(() => expect(screen.queryByText('java')).not.toBeInTheDocument());
  });
});
