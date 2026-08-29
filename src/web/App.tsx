import { useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useNodesInitialized,
  useReactFlow,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Node as RFNode,
  type Edge as RFEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphModel } from '../core/types';
import { buildVisibleGraph } from './graph/view';
import { toReactFlow, type ClgNodeData } from './graph/toReactFlow';
import { useDispatch, useViewState } from './state';
import { PackageNode } from './nodes/PackageNode';
import { ClassNode } from './nodes/ClassNode';
import { Panel } from './controls/Panel';
import { Legend } from './controls/Legend';
import { DetailsPanel } from './controls/DetailsPanel';
import { viewportForNodes } from './graph/viewport';
import { typeNodeId, visibleUnitId } from './graph/packages';
import type { ViewGraph } from './graph/types';

const nodeTypes = { clgPackage: PackageNode, clgClass: ClassNode };

export function resolveSearchId(
  model: GraphModel,
  view: ViewGraph,
  expandedPackages: Set<string>,
  search: string,
  selectedNodeId: string | null,
): string | null {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return selectedNodeId;
  const visibleHit = view.nodes.find((node) =>
    (node.fqcn ?? node.package).toLocaleLowerCase().includes(query),
  );
  if (visibleHit) return visibleHit.id;
  const classHit = model.classes.find((fqcn) => fqcn.toLocaleLowerCase().includes(query));
  if (!classHit) return selectedNodeId;
  const id = visibleUnitId(classHit, expandedPackages);
  if (view.nodes.some((node) => node.id === id)) return id;
  const groupedId = typeNodeId(classHit);
  return view.nodes.some((node) => node.id === groupedId) ? groupedId : selectedNodeId;
}

function Canvas({ model }: { model: GraphModel }) {
  const state = useViewState();
  const dispatch = useDispatch();
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode<ClgNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const { setViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const lastFitKey = useRef('');
  const lastLayoutRevision = useRef(state.layoutRevision ?? 0);
  const view = useMemo(
    () => buildVisibleGraph(model, state),
    [model, state.filter, state.expandedPackages, state.expandedTypes, state.visibleOrigins],
  );

  // Resolve hidden class matches to the namespace that currently represents them.
  const searchId = useMemo(
    () => resolveSearchId(model, view, state.expandedPackages, state.search, state.selectedNodeId),
    [model, state.expandedPackages, state.search, state.selectedNodeId, view],
  );
  const fitKey = useMemo(
    () =>
      `${state.layoutRevision ?? 0}|${state.abbreviate}|${view.nodes
        .map((node) => node.id)
        .join('\n')}|${view.edges.map((edge) => edge.id).join('\n')}`,
    [state.abbreviate, state.layoutRevision, view],
  );

  useEffect(() => {
    const rf = toReactFlow(
      view,
      state.abbreviate,
      searchId,
      state.edgeColorMode,
      state.selectedEdgeId,
    );
    setNodes(rf.nodes);
    setEdges(rf.edges);
    const layoutRevision = state.layoutRevision ?? 0;
    if (layoutRevision !== lastLayoutRevision.current) {
      lastLayoutRevision.current = layoutRevision;
      const padding = window.innerWidth < 600 ? 56 : 24;
      const viewport = viewportForNodes(rf.nodes, window.innerWidth, window.innerHeight, padding);
      if (viewport) void setViewport(viewport);
    }
  }, [
    view,
    state.abbreviate,
    searchId,
    state.edgeColorMode,
    state.selectedEdgeId,
    state.layoutRevision,
    setNodes,
    setEdges,
    setViewport,
  ]);

  useEffect(() => {
    if (!nodesInitialized || lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    const padding = window.innerWidth < 600 ? 56 : 24;
    const viewport = viewportForNodes(nodes, window.innerWidth, window.innerHeight, padding);
    if (viewport) void setViewport(viewport);
  }, [nodes, nodesInitialized, setViewport, fitKey]);

  useEffect(() => {
    if (!state.search.trim() || !searchId) return;
    const node = nodes.find((candidate) => candidate.id === searchId);
    if (!node) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    void setViewport(
      {
        x: window.innerWidth / 2 - node.position.x,
        y: window.innerHeight / 2 - node.position.y,
        zoom: 1,
      },
      reduceMotion ? undefined : { duration: 250 },
    );
  }, [nodes, searchId, setViewport, state.search]);

  const onNodeClick: NodeMouseHandler = (_, node) => {
    dispatch({ type: 'select', id: node.id });
  };
  const onEdgeClick: EdgeMouseHandler = (_, edge) => {
    dispatch({ type: 'selectEdge', id: edge.id });
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={() => dispatch({ type: 'select', id: null })}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1.25 }}
      minZoom={0.05}
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
      <Panel model={model} />
      <DetailsPanel node={view.nodes.find((node) => node.id === state.selectedNodeId)} />
      <Legend />
    </ReactFlow>
  );
}

export function App({ model }: { model: GraphModel }) {
  if (model.edges.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h2>No class resolutions found</h2>
        <p>
          The trace contained no <code>class,resolve</code> entries. Re-run with{' '}
          <code>-Xlog:class+resolve=debug,class+load=info</code> (JDK 9+) or{' '}
          <code>-XX:+TraceClassResolution</code> (JDK ≤ 8).
        </p>
      </div>
    );
  }
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
        <Canvas model={model} />
      </ReactFlowProvider>
    </div>
  );
}
