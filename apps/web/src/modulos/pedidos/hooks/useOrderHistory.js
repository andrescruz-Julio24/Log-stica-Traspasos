'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../shared/services/apiClient';

/** Consulta el historial y conserva resultados únicamente del folio vigente. */
export function useOrderHistory(id) {
  const [snapshot, setSnapshot] = useState({ id: null, events: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    api('/orders/' + id + '/history', { signal: controller.signal })
      .then((events) => {
        if (!controller.signal.aborted) setSnapshot({ id, events, error: '' });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setSnapshot({ id, events: [], error: reason.message });
      });
    return () => controller.abort();
  }, [id]);
  return snapshot.id === id
    ? { events: snapshot.events, error: snapshot.error }
    : { events: [], error: '' };
}
