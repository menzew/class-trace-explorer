import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EmbeddedData } from '../core/types';
import { App } from './App';
import { StateProvider } from './state';
import { devFixture } from './devFixture';

const PLACEHOLDER = '__CLG_DATA_PLACEHOLDER__';

function loadData(): EmbeddedData {
  const el = document.getElementById('clg-data');
  const raw = el?.textContent?.trim() ?? '';
  if (!raw || raw === PLACEHOLDER) return devFixture;
  try {
    return JSON.parse(raw) as EmbeddedData;
  } catch {
    return devFixture;
  }
}

const data = loadData();
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <StateProvider opts={data.opts}>
      <App model={data.graph} />
    </StateProvider>
  </StrictMode>,
);
