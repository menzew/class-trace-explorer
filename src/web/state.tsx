import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { GraphModel } from '../core/types';
import type { EdgeColorMode, ViewState } from './graph/types';
import { namespacePrefixes, outerClassOf, packageNodeId, packageOf } from './graph/packages';
import type { EmbeddedOpts } from '../core/types';
import type { ClassOrigin } from '../core/types';

export const ALL_ORIGINS: ClassOrigin[] = ['application', 'system', 'dependency', 'unknown'];

export type Action =
  | { type: 'setFilter'; value: string }
  | { type: 'toggleOrigin'; origin: ClassOrigin }
  | { type: 'setOrigins'; origins: ClassOrigin[] }
  | { type: 'toggleAbbreviate' }
  | { type: 'setSearch'; value: string }
  | { type: 'revealClass'; fqcn: string }
  | { type: 'revealNamespace'; pkg: string }
  | { type: 'toggleExpand'; pkg: string }
  | { type: 'toggleType'; outer: string }
  | { type: 'expandAll'; model: GraphModel }
  | { type: 'collapseAll' }
  | { type: 'relayout' }
  | { type: 'reset' }
  | { type: 'setEdgeColorMode'; mode: EdgeColorMode }
  | { type: 'selectEdge'; id: string | null }
  | { type: 'select'; id: string | null };

export function initialState(opts: EmbeddedOpts): ViewState {
  return {
    filter: opts.filter,
    visibleOrigins: new Set(ALL_ORIGINS),
    abbreviate: opts.abbreviate,
    search: '',
    expandedPackages: new Set<string>(),
    expandedTypes: new Set<string>(),
    selectedNodeId: null,
    selectedEdgeId: null,
    edgeColorMode: 'direction',
    layoutRevision: 0,
    initialFilter: opts.filter,
    initialAbbreviate: opts.abbreviate,
  };
}

export function reduce(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case 'setFilter':
      return { ...state, filter: action.value || null, selectedEdgeId: null };
    case 'toggleOrigin': {
      const next = new Set(state.visibleOrigins);
      if (next.has(action.origin)) next.delete(action.origin);
      else next.add(action.origin);
      return { ...state, visibleOrigins: next, selectedNodeId: null, selectedEdgeId: null };
    }
    case 'setOrigins':
      return {
        ...state,
        visibleOrigins: new Set(action.origins),
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    case 'toggleAbbreviate':
      return { ...state, abbreviate: !state.abbreviate };
    case 'setSearch':
      return { ...state, search: action.value };
    case 'revealClass': {
      const next = new Set(state.expandedPackages);
      for (const prefix of namespacePrefixes(packageOf(action.fqcn))) next.add(prefix);
      return {
        ...state,
        search: action.fqcn,
        expandedPackages: next,
        expandedTypes: new Set(state.expandedTypes).add(outerClassOf(action.fqcn)),
        selectedNodeId: action.fqcn,
        selectedEdgeId: null,
      };
    }
    case 'revealNamespace': {
      const next = new Set(state.expandedPackages);
      const parents = namespacePrefixes(action.pkg).slice(0, -1);
      for (const prefix of parents) next.add(prefix);
      return {
        ...state,
        search: action.pkg,
        expandedPackages: next,
        selectedNodeId: packageNodeId(action.pkg),
        selectedEdgeId: null,
      };
    }
    case 'toggleExpand': {
      const next = new Set(state.expandedPackages);
      const expandedTypes = new Set(state.expandedTypes);
      if (next.has(action.pkg)) {
        for (const prefix of next) {
          if (prefix === action.pkg || prefix.startsWith(`${action.pkg}.`)) next.delete(prefix);
        }
        for (const outer of expandedTypes) {
          const pkg = packageOf(outer);
          if (pkg === action.pkg || pkg.startsWith(`${action.pkg}.`)) expandedTypes.delete(outer);
        }
      } else next.add(action.pkg);
      return { ...state, expandedPackages: next, expandedTypes, selectedEdgeId: null };
    }
    case 'toggleType': {
      const next = new Set(state.expandedTypes);
      if (next.has(action.outer)) next.delete(action.outer);
      else next.add(action.outer);
      return { ...state, expandedTypes: next, selectedEdgeId: null };
    }
    case 'expandAll': {
      const next = new Set<string>();
      for (const fqcn of action.model.classes) {
        for (const prefix of namespacePrefixes(packageOf(fqcn))) next.add(prefix);
      }
      return {
        ...state,
        expandedPackages: next,
        expandedTypes: new Set(action.model.classes.map(outerClassOf)),
        selectedEdgeId: null,
      };
    }
    case 'collapseAll':
      return {
        ...state,
        expandedPackages: new Set<string>(),
        expandedTypes: new Set<string>(),
        selectedEdgeId: null,
      };
    case 'relayout':
      return { ...state, layoutRevision: (state.layoutRevision ?? 0) + 1 };
    case 'reset':
      return {
        ...state,
        filter: state.initialFilter ?? null,
        visibleOrigins: new Set(ALL_ORIGINS),
        abbreviate: state.initialAbbreviate ?? false,
        search: '',
        expandedPackages: new Set<string>(),
        expandedTypes: new Set<string>(),
        selectedNodeId: null,
        selectedEdgeId: null,
        edgeColorMode: 'direction',
        layoutRevision: (state.layoutRevision ?? 0) + 1,
      };
    case 'setEdgeColorMode':
      return { ...state, edgeColorMode: action.mode };
    case 'selectEdge':
      return { ...state, selectedEdgeId: action.id, selectedNodeId: null };
    case 'select':
      return { ...state, selectedNodeId: action.id, selectedEdgeId: null };
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
