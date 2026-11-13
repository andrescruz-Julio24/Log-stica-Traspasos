'use client';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
export function WorkspaceProvider({ query, children }) {
  const workspace = useWorkspaceData(query);
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}
