import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
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

const nodeTypes = { clgPackage: PackageNode, clgClass: ClassNode };

function Canvas({ model }: { model: GraphModel }) {
  const state = useViewState();
  const dispatch = useDispatch();
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode<ClgNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  // Search resolves to a node id to highlight (first id containing the term).
  const searchId = useMemo(() => {
    if (!state.search) return state.selectedNodeId;
    const view = buildVisibleGraph(model, state);
    const hit = view.nodes.find((n) => n.id.includes(state.search));
    return hit?.id ?? state.selectedNodeId;
  }, [model, state]);

  useEffect(() => {
    const view = buildVisibleGraph(model, state);
    const rf = toReactFlow(view, state.abbreviate, searchId);
    setNodes(rf.nodes);
    setEdges(rf.edges);
  }, [model, state, searchId, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = (_, node) => {
    dispatch({ type: 'select', id: node.id });
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={() => dispatch({ type: 'select', id: null })}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.05}
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
      <Panel model={model} />
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
          <code>-Xlog:class+resolve=debug</code> (JDK 9+) or{' '}
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
