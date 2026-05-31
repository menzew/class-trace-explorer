import { beforeAll, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
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
    expect(screen.getByText('a (1)')).toBeInTheDocument();
    expect(screen.getByText('b (1)')).toBeInTheDocument();
  });

  it('shows an empty state when there are no edges', () => {
    render(
      <StateProvider opts={{ abbreviate: false, filter: null }}>
        <App model={{ classes: [], edges: [] }} />
      </StateProvider>,
    );
    expect(screen.getByText('No class resolutions found')).toBeInTheDocument();
  });
});
