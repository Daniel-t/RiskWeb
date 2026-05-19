import { useState } from 'react';
import { NodePalette } from '../Canvas/NodePalette';
import { ControlLibraryPanel } from './ControlLibraryPanel';

interface LeftSidebarTabsProps {
  onCreateControl: () => void;
  onEditControl: (id: string) => void;
  onOpenCatalog: () => void;
}

export function LeftSidebarTabs({ onCreateControl, onEditControl, onOpenCatalog }: LeftSidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'controls'>('nodes');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-panel)',
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => setActiveTab('nodes')}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            borderBottom: activeTab === 'nodes' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            fontSize: 12,
            fontWeight: activeTab === 'nodes' ? 600 : 400,
            color: activeTab === 'nodes' ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Nodes
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            borderBottom: activeTab === 'controls' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            fontSize: 12,
            fontWeight: activeTab === 'controls' ? 600 : 400,
            color: activeTab === 'controls' ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Controls
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'nodes' ? (
          <NodePalette />
        ) : (
          <ControlLibraryPanel
            onCreateNew={onCreateControl}
            onEditControl={onEditControl}
            onOpenCatalog={onOpenCatalog}
          />
        )}
      </div>
    </div>
  );
}
