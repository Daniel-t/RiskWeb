import { useCallback, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type ReactFlowInstance,
  type Connection,
  type OnNodesChange,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTreeStore } from '../../store/treeStore';
import { LeafNode } from './nodes/LeafNode';
import { GateNode } from './nodes/GateNode';
import { ContextMenu, type ContextMenuState } from './ContextMenu';

const nodeTypes = {
  leaf: LeafNode,
  gate: GateNode,
};

export function AttackTreeCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    removeNode,
    removeNodeAndDescendants,
    duplicateNode,
    removeEdge,
    setSelectedNodeId,
    canConnect,
  } = useTreeStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection);
    },
    [addEdge],
  );

  const isValidConnection = useCallback(
    (connection: Connection | { source: string; target: string }) => {
      return canConnect(connection as Connection);
    },
    [canConnect],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/riskweb-node-type') as
        | 'leaf'
        | 'and'
        | 'or';
      if (!type || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      addNode(type, position);
    },
    [rfInstance, addNode],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setContextMenu(null);
  }, [setSelectedNodeId]);

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      nodeId: node.id,
    });
  }, []);

  const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      edgeId: edge.id,
    });
  }, []);

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      if (!rfInstance) return;
      const flowPosition = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'canvas',
        // store flow position for node creation
        nodeId: `${flowPosition.x},${flowPosition.y}`,
      });
    },
    [rfInstance],
  );

  const handleContextAddNode = useCallback(
    (type: 'leaf' | 'and' | 'or') => {
      // The position from context menu is screen coords; convert to flow
      if (rfInstance && contextMenu) {
        const flowPos = rfInstance.screenToFlowPosition({
          x: contextMenu.x,
          y: contextMenu.y,
        });
        addNode(type, flowPos);
      }
    },
    [rfInstance, contextMenu, addNode],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      const nodeEdges = edges.filter((e) => e.source === id);
      if (nodeEdges.length > 0) {
        // Has children — for simplicity, delete node and descendants
        if (window.confirm('Delete node and all descendants?')) {
          removeNodeAndDescendants(id);
        }
      } else {
        removeNode(id);
      }
    },
    [edges, removeNode, removeNodeAndDescendants],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNode = nodes.find((n) => n.selected);
        if (selectedNode) {
          handleDeleteNode(selectedNode.id);
          return;
        }
        const selectedEdge = edges.find((e) => e.selected);
        if (selectedEdge) {
          removeEdge(selectedEdge.id);
        }
      }
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
      }
    },
    [nodes, edges, handleDeleteNode, removeEdge, setSelectedNodeId],
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }} onKeyDown={onKeyDown}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange as OnNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={null}
        selectionKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d0d5dd" />
        <Controls position="top-right" />
      </ReactFlow>

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddNode={handleContextAddNode}
          onDeleteNode={handleDeleteNode}
          onDuplicateNode={duplicateNode}
          onDeleteEdge={removeEdge}
        />
      )}

      {nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--text-muted)',
            fontSize: 15,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          Drag nodes from the palette to start building your attack tree
        </div>
      )}
    </div>
  );
}
