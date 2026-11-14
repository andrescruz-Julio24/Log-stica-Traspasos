'use client';
import { ViewBoundary } from './ViewBoundary';
import { resourceNames } from '../data/queries';
import { RefreshCw } from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
export function RefreshButton() {
  const { reload, saving } = useWorkspace();
  return (
    <button
      type="button"
      className="secondary"
      disabled={saving}
      onClick={() => reload().catch(() => {})}
    >
      <RefreshCw size={16} /> Actualizar
    </button>
  );
}
export function WorkspaceContent({ children, fallback }) {
  const {
    error,
    notice,
    loading,
    loadFailed,
    resources,
    keys,
    retry,
    setError,
    setNotice,
    reload,
  } = useWorkspace();
  return (
    <>
      {keys.map((key) => {
        const state = resources[key];
        if (state?.status === 'success') return null;
        if (!state || state.status === 'loading')
          return (
            <p role="status" key={key}>
              Consultando {(resourceNames[key] || 'Entregas de cliente')}…
            </p>
          );
        return (
          <div key={key} className="message error" role="alert">
            <span>
              {resourceNames[key]}: {state.error}{' '}
              {state.value
                ? 'Se conserva la última consulta de esta pantalla.'
                : 'Datos no disponibles.'}{' '}
              Las acciones que necesitan estos datos quedan pendientes.
            </span>
            <button
              className="secondary"
              onClick={() => retry(key).catch(() => {})}
            >
              Reintentar {resourceNames[key]}
            </button>
          </div>
        );
      })}
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
        <>{fallback}</>
      ) : (
        <ViewBoundary reload={reload}>{children}</ViewBoundary>
      )}
    </>
  );
}
