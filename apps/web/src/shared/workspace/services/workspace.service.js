import { api } from '../../services/apiClient';
import { emptyWorkspaceData, queriesBySection } from '../data/queries';

async function loadResource(key, signal) {
  const value = await api('/' + key, { signal });
  const valid =
    key === 'bootstrap'
      ? ['products', 'locations', 'stocks'].every((field) =>
          Array.isArray(value?.[field]),
        )
      : Array.isArray(value);
  if (!valid)
    throw new Error(
      'La respuesta de ' +
        key +
        ' está incompleta. Actualiza para volver a consultar.',
    );
  return key === 'bootstrap' ? value : { [key]: value };
}
export async function fetchWorkspaceSection(section, signal) {
  const resources = queriesBySection[section];
  if (!resources) throw new Error('Sección de consulta desconocida');
  try {
    const deadline = AbortSignal.timeout(15000);
    const requestSignal = signal
      ? AbortSignal.any([signal, deadline])
      : deadline;
    const parts = await Promise.all(
      resources.map((key) => loadResource(key, requestSignal)),
    );
    return Object.assign({}, emptyWorkspaceData, ...parts);
  } catch (error) {
    if (error.name === 'TimeoutError')
      throw new Error(
        'La consulta tardó demasiado. Actualiza para reintentar.',
      );
    throw error;
  }
}
