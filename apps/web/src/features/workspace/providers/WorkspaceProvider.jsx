'use client';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
export function WorkspaceProvider({ section, children }) {
  const workspace = useWorkspaceData(section);
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}
