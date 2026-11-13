'use client';
import { ViewBoundary } from './ViewBoundary';
import { RefreshCw } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
export function RefreshButton() {
  const { reload, busy } = useWorkspace();
  return (
    <button
      type="button"
      disabled={busy}
      className="secondary"
      onClick={() => reload().catch(() => {})}
    >
      <RefreshCw size={16} /> Actualizar
    </button>
  );
}
export function WorkspaceContent({ children, fallback }) {
  const { error, notice, loading, loadFailed, setError, setNotice, reload } =
    useWorkspace();
  return (
    <>
      {error && (
        <div className="message error" role="alert">
          {error}
          {!loadFailed && (
            <button
              aria-label="Cerrar error"
              className="ghost"
              onClick={() => setError('')}
            >
              ×
            </button>
          )}
        </div>
      )}
      {notice && (
        <div className="message success" role="status">
          {notice}
          <button
            aria-label="Cerrar aviso"
            className="ghost"
            onClick={() => setNotice('')}
          >
            ×
          </button>
        </div>
      )}
      {loading ? (
        <div className="loading">Cargando datos de operación...</div>
      ) : loadFailed ? (
        <>
          {fallback}
          <button
            className="secondary"
            onClick={() => reload().catch(() => {})}
          >
            Reintentar consulta
          </button>
        </>
      ) : (
        <ViewBoundary reload={reload}>{children}</ViewBoundary>
      )}
    </>
  );
}
