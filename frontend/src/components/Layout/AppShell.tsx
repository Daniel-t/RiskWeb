import type { ReactNode } from 'react';

interface AppShellProps {
  topBar: ReactNode;
  leftSidebar: ReactNode;
  canvas: ReactNode;
  rightSidebar: ReactNode;
  resultsDrawer: ReactNode;
}

export function AppShell({ topBar, leftSidebar, canvas, rightSidebar, resultsDrawer }: AppShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {topBar}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {leftSidebar}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{canvas}</div>
        {rightSidebar}
      </div>
      {resultsDrawer}
    </div>
  );
}
