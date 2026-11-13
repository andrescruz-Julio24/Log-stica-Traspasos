'use client';
import { useContext } from 'react';
import { WorkspaceContext } from '../contexts/WorkspaceContext';
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace requiere WorkspaceProvider');
  return workspace;
}
