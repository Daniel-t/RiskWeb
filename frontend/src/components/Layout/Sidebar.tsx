import type { ReactNode } from 'react';

interface SidebarProps {
  side: 'left' | 'right';
  width: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Sidebar({ side, width, collapsed, onToggle, children }: SidebarProps) {
  const chevron =
    side === 'left' ? (collapsed ? '\u00BB' : '\u00AB') : collapsed ? '\u00AB' : '\u00BB';

  return (
    <div
      style={{
        width: collapsed ? 0 : width,
        minWidth: collapsed ? 0 : width,
        overflow: 'hidden',
        borderLeft: side === 'right' ? '1px solid var(--border-panel)' : undefined,
        borderRight: side === 'left' ? '1px solid var(--border-panel)' : undefined,
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: 8,
          [side === 'left' ? 'right' : 'left']: collapsed ? -24 : 4,
          zIndex: 10,
          width: 20,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: 'var(--text-muted)',
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-panel)',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        {chevron}
      </button>
      {!collapsed && <div style={{ padding: 16, paddingLeft: side === 'right' ? 28 : 16, overflow: 'auto', flex: 1 }}>{children}</div>}
    </div>
  );
}
