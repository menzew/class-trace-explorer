import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { GraphModel } from '../core/types';
import type { ViewState } from './graph/types';
import { packageOf } from './graph/packages';
import type { EmbeddedOpts } from '../core/types';

export type Action =
  | { type: 'setFilter'; value: string }
  | { type: 'toggleAbbreviate' }
  | { type: 'setSearch'; value: string }
  | { type: 'toggleExpand'; pkg: string }
  | { type: 'expandAll'; model: GraphModel }
  | { type: 'collapseAll' }
  | { type: 'select'; id: string | null };

export function initialState(opts: EmbeddedOpts): ViewState {
  return {
    filter: opts.filter,
    abbreviate: opts.abbreviate,
    search: '',
    expandedPackages: new Set<string>(),
    selectedNodeId: null,
  };
}

export function reduce(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case 'setFilter':
      return { ...state, filter: action.value || null };
    case 'toggleAbbreviate':
      return { ...state, abbreviate: !state.abbreviate };
    case 'setSearch':
      return { ...state, search: action.value };
    case 'toggleExpand': {
      const next = new Set(state.expandedPackages);
      if (next.has(action.pkg)) next.delete(action.pkg);
      else next.add(action.pkg);
      return { ...state, expandedPackages: next };
    }
    case 'expandAll': {
      const next = new Set<string>();
      for (const fqcn of action.model.classes) next.add(packageOf(fqcn));
      return { ...state, expandedPackages: next };
    }
    case 'collapseAll':
      return { ...state, expandedPackages: new Set<string>() };
    case 'select':
      return { ...state, selectedNodeId: action.id };
    default:
      return state;
  }
}

const StateContext = createContext<ViewState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function StateProvider({ opts, children }: { opts: EmbeddedOpts; children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, opts, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useViewState(): ViewState {
  const s = useContext(StateContext);
  if (!s) throw new Error('useViewState must be used within StateProvider');
  return s;
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchContext);
  if (!d) throw new Error('useDispatch must be used within StateProvider');
  return d;
}
